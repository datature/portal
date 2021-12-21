import os

import cv2
from PIL import Image
import numpy as np
import tensorflow as tf

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models.abstract.BaseModel import BaseModel
from server.utilities.yolo.yolo.yolo import YOLO_np
from server.utilities.yolo.yolo.yolo3.postprocess_np import yolo3_postprocess_np

class YoloTensorflowModel(BaseModel):
    def _load_label_map_(self):
        self._label_map_ = {}
        with open(
            os.path.join(self._directory_, "label.txt"), "r", encoding="UTF8"
        ) as label_file:
            counter = 0
            for line in label_file:
                self._label_map_[str(counter)] = {
                    "id": counter,
                    "name": line.strip()
                }
                counter += 1
    
    def register(self):
        if not os.path.isfile(
            os.path.join(self._directory_, "label.txt")
        ):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "label.txt is not found in given directory.",
            )
        if not (
            os.path.isfile(
                os.path.join(
                    self._directory_, "model.h5"
                )
            )
        ):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "model.h5 is not found in given directory",
            )
        self._height_ = 1024 if self._height_ is None else self._height_
        self._width_ = 1024 if self._width_ is None else self._width_
        self._load_label_map_()
        self._key_ = get_hash(self._directory_)
        return self._key_, self
    
    def load(self):
        yolo = YOLO_np(
            model_type="yolo4_mobilenet_lite",
            weights_path = os.path.join(self._directory_, "model.h5"),
            anchors_path="./server/utilities/yolo/yolo/configs/yolo4_anchors.txt",
            classes_path = os.path.join(self._directory_, "label.txt"),
            model_input_shape=(320, 320),
            elim_grid_sense=False
        )
        self._model_ = yolo
    
    def predict(self, image_array):
        if self._model_ is None:
            raise PortalError(Errors.NOTFOUND, "Model is not Loaded")
        model = self._model_
        image = Image.fromarray(image_array).convert('RGB')
        out_boxes, out_classes, out_scores = model.detect_image(image)

        output_dict = {
            "detection_boxes": out_boxes,
            "detection_scores": out_scores,
            "detection_classes": out_classes,
        }
        return output_dict




