#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   endpoint_model.py
@Author  :   Marcus Neo
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the Endpoint Model class.
"""
import hashlib
from base64 import encodebytes

import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw
from server.models.abstract.BaseModel import BaseModel
from server.services.errors import Errors, PortalError


class EndpointModel(BaseModel):
    """Implementation of the Endpoint Model."""

    def _load_label_map_(self):
        """Overloaded from Parent Class."""
        index = self.kwargs["link"].rfind("/predict")
        link = self.kwargs["link"][:index] + "/classes"
        project_secret = self.kwargs["project_secret"]
        headers = {"Authorization": "Bearer " + project_secret}
        response = requests.get(
            url=link,
            headers=headers,
        )
        if response.status_code != 200:
            raise PortalError(
                Errors.ENDPOINTFAILED,
                "Could not load the endpoint label map. "
                "This could signify that the endpoint is "
                "corrupted or simply not present.",
            )
        label_map = response.json()
        self._label_map_ = {}
        for id, dct in label_map.items():
            dct["id"] = int(id)
            self._label_map_[id] = dct

    def register(self):
        """Overloaded from Parent Class."""
        self._load_label_map_()
        link = self.kwargs["link"]
        project_secret = self.kwargs["project_secret"]
        pre_hash = (
            f"endpoint{self._name_}{self._description_}{link}{project_secret}"
        ).encode("utf-8")
        self._key_ = hashlib.md5(pre_hash).hexdigest()
        return self._key_, self

    def load(self):
        """Overloaded from Parent Class."""
        pass

    def predict(self, image_array):
        """Overloaded from Parent Class."""
        # convert potential rgba to rgb:
        # get array height and width:
        height, width, channels = image_array.shape
        # convert the array back to bgr for exporting

        image_array = (
            cv2.cvtColor(image_array, cv2.COLOR_RGBA2BGR)
            if channels == 4
            else cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        )
        _, bts = cv2.imencode(".jpg", image_array)
        base64_array = {
            "data": encodebytes(bts.tostring()).decode("ascii"),
            "image_type": "base_64",
        }
        link = self.kwargs["link"]
        project_secret = self.kwargs["project_secret"]
        headers = {"Authorization": "Bearer " + project_secret}
        response = requests.post(
            url=link,
            json=base64_array,
            headers=headers,
        )
        output = response.json()

        # convert output into the tensor required by the BaseModel predict
        boxes = []
        classes = []
        scores = []
        masks = []
        for single_detection in output["predictions"]:
            # 1. bounds to bbox:
            bounds = single_detection["bound"]
            top_left = bounds[0]
            bottom_right = bounds[2]
            x_min = top_left[0]
            y_min = top_left[1]
            x_max = bottom_right[0]
            y_max = bottom_right[1]
            boxes.append([y_min, x_min, y_max, x_max])
            # 2. confidence to scores:
            confidence = single_detection["confidence"]
            scores.append(confidence)
            # 3a. append to label_map if doesn't exist
            tag = single_detection["tag"]
            tag_id = tag["id"]
            tag_name = tag["name"]
            if not str(tag_id) in self._label_map_:
                self._label_map_[str(tag_id)] = {
                    "id": int(tag_id),
                    "name": str(tag_name),
                }
            # 3b. tag_id to detection_classes
            classes.append(int(tag_id))

            # 4. convert polygons to masks
            bound_type = single_detection["boundType"]
            if bound_type == "masks":
                polygon = single_detection["contour"]
                for index, point in enumerate(polygon):
                    list_point = list(point)
                    list_point[0] = int(list_point[0] * width)
                    list_point[1] = int(list_point[1] * height)
                    polygon[index] = tuple(list_point)
                mask_img = Image.new("L", (width, height), 0)
                ImageDraw.Draw(mask_img).polygon(polygon, outline=1, fill=1)
                mask = np.expand_dims(np.array(mask_img), axis=0)
                masks.append(mask)
        masks = np.concatenate(masks) if masks != [] else None

        # 4. package them into the required detections output
        detections = {}
        detections["detection_masks"] = masks
        detections["detection_boxes"] = np.squeeze(np.array(boxes))
        detections["detection_scores"] = np.squeeze(np.array(scores))
        detections["detection_classes"] = np.squeeze(np.array(classes))
        return detections
