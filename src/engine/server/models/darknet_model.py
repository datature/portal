#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   darknet_model.py
@Author  :   Marcus Neo
@Version :   0.5.7
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the Darknet Model class.
'''
import os

import cv2
import numpy as np

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models.abstract.BaseModel import BaseModel


class DarknetModel(BaseModel):
    """Implementation of the Darknet Model."""

    def _load_label_map_(self):
        """Overloaded from Parent Class."""
        labels = (open(os.path.join(
            self._directory_, self._labelsname_)).read().strip().split("\n"))
        self._label_map_ = {
            str(label_index): {
                "id": label_index,
                "name": label_name
            }
            for label_index, label_name in enumerate(labels)
        }

    def register(self):
        """Overloaded from Parent Class."""
        self._labelsname_ = self._weightsname_ = self._configname_ = ""
        labels = weights = configs = 0
        for file in os.listdir(self._directory_):
            if file.endswith(".names"):
                self._labelsname_ = os.path.join(self._directory_, file)
                labels += 1
            if file.endswith(".weights"):
                self._weightsname_ = os.path.join(self._directory_, file)
                weights += 1
            if file.endswith(".cfg"):
                self._configname_ = os.path.join(self._directory_, file)
                configs += 1

        if self._labelsname_ == "":
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "class label file .names is not found in given directory.",
            )
        if labels > 1:
            raise PortalError(Errors.OVERLOADED,
                              "multiple class label files found.")
        if self._weightsname_ == "":
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "weights file .weights is not found in given directory",
            )
        if weights > 1:
            raise PortalError(Errors.OVERLOADED,
                              "multiple weights label files found.")
        if self._configname_ == "":
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "config file .cfg is not found in given directory.",
            )
        if configs > 1:
            raise PortalError(Errors.OVERLOADED,
                              "multiple config files found.")
        with open(self._configname_, "r") as conf:
            heightcheck = False
            widthcheck = False
            for line in conf:
                if heightcheck and widthcheck:
                    break
                if "height" in line:
                    self._height_ = int(
                        line.replace("=", "").replace("height", "").strip())
                    heightcheck = True
                if "width" in line:
                    self._width_ = int(
                        line.replace("=", "").replace("width", "").strip())
                    widthcheck = True
        self._load_label_map_()
        self._key_ = get_hash(self._directory_)
        return self._key_, self

    def load(self):
        """Overloaded from Parent Class."""
        loaded_model = cv2.dnn.readNetFromDarknet(self._configname_,
                                                  self._weightsname_)
        self._model_ = loaded_model

    def predict(self, image_array):
        """Overloaded from Parent Class."""
        try:
            model = self._model_
            (H, W) = image_array.shape[:2]
            ln = model.getLayerNames()
            ln = [ln[i[0] - 1] for i in model.getUnconnectedOutLayers()]
            blob = cv2.dnn.blobFromImage(
                image_array,
                1 / 255.0,
                (self._height_, self._width_),
                swapRB=True,
                crop=False,
            )
            model.setInput(blob)
            layerOutputs = model.forward(ln)
            boxes = []
            confidences = []
            classIDs = []

            for output in layerOutputs:
                for detection in output:
                    scores = detection[5:]
                    classID = np.argmax(scores)
                    confidence = scores[classID]
                    box = detection[0:4]
                    (centerX, centerY, width, height) = box
                    xmin = centerX - (width / 2)
                    ymin = centerY - (height / 2)
                    xmax = xmin + width
                    ymax = ymin + height
                    boxes.append([ymin, xmin, ymax, xmax])
                    confidences.append(float(confidence))
                    classIDs.append(classID)
            detections = {}
            detections["detection_masks"] = None
            detections["detection_boxes"] = np.squeeze(np.array(boxes))
            detections["detection_scores"] = np.squeeze(np.array(confidences))
            detections["detection_classes"] = np.squeeze(np.array(classIDs))
            return detections
        except Exception as e:
            raise PortalError(Errors.FAILEDPREDICTION, str(e))
