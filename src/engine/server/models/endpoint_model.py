import requests
import hashlib
from base64 import encodebytes

import numpy as np
import cv2
from PIL import Image, ImageDraw

from server.services.errors import Errors, PortalError

from server.models.abstract.BaseModel import BaseModel


class EndpointModel(BaseModel):
    def register(self):
        link = self.kwargs["link"]
        project_secret = self.kwargs["project_secret"]
        pre_hash = (
            self._type_
            + self._name_
            + self._description_
            + link
            + project_secret
        ).encode("utf-8")
        self._key_ = hashlib.md5(pre_hash).hexdigest()
        return self._key_, self

    def load(self):
        pass

    def predict(self, image_array):
        # convert potential rgba to rgb:
        # get array height and width:
        height, width, channels = image_array
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
        headers = {"Authorization": "Bearer " + self.kwargs["project_secret"]}
        response = requests.post(
            url=self.kwargs["link"],
            json=base64_array,
            headers=headers,
        )
        output = response.json()
        # convert output into the tensor required by the BaseModel predict
        boxes = []
        classes = []
        scores = []

        for single_detection in output:
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
            masks = None
            if bound_type != "masks":
                polygon = single_detection["contour"]
                mask_img = Image.new("L", (width, height), 0)
                ImageDraw.Draw(mask_img).polygon(polygon, outline=1, fill=1)
                masks = np.array(mask_img)

        # 4. package them into the required detections output
        detections = {}
        detections["detection_masks"] = masks
        detections["detection_boxes"] = np.squeeze(np.array(boxes))
        detections["detection_scores"] = np.squeeze(np.array(scores))
        detections["detection_classes"] = np.squeeze(np.array(classes))
        return detections
        # return output.text
