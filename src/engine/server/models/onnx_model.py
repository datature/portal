import importlib
import os

import cv2
import numpy as np
import onnxruntime as ort

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash
from server.models.abstract.BaseModel import BaseModel
from server.utilities.onnx_models.abstract import AbstractProcessor


class OnnxModel(BaseModel):

    def _load_label_map_(self):

        self._label_map_ = {}
        with open(os.path.join(self._directory_, "label_map.pbtxt"),
                  "r") as label_file:
            for line in label_file:
                if "id" in line:
                    label_index = int(line.split(":")[-1])
                    label_name = (
                        next(label_file).split(":")[-1].strip().strip("'"))
                    self._label_map_[str(label_index)] = {
                        "id": label_index,
                        "name": label_name
                    }
        self._label_map_["0"] = {"id": 0, "name": "Background"}
        with open(os.path.join(self._directory_, "label_map.pbtxt"),
                  "r",
                  encoding="utf-8") as infile:
            lines = infile.readlines()
        self.category_map = {
            int(lines[num + 1].replace("id:", "").strip()):
            lines[num + 2].replace("name:", "").replace('"', "").strip()
            for num, line in enumerate(lines) if "item {" in line
        }
        self.category_map[0] = "Background"

    def register(self):
        if not os.path.isfile(os.path.join(self._directory_,
                                           "label_map.pbtxt")):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "label_map.pbtxt is not found in given directory.")
        if not os.path.isfile(os.path.join(self._directory_, "model.onnx")):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "model.onnx is not found in the given directory.")

        self._height_ = 1024 if self._height_ is None else self._height_
        self._width_ = 1024 if self._width_ is None else self._width_

        self._load_label_map_()
        self._key_ = get_hash(self._directory_)

        return self._key_, self

    def feed_forward(self, image_array: np.ndarray):
        detections = self._model_.run(
            self.model_output_names, {
                input_name: np.expand_dims(image_array, 0)
                for input_name in self.model_input_names
            })
        return detections

    def load(self):
        loaded_model = ort.InferenceSession(
            os.path.join(self._directory_, "model.onnx"))
        self.model_inputs = loaded_model.get_inputs()
        self.model_input_names = list(map(lambda x: x.name, self.model_inputs))
        self.model_outputs = loaded_model.get_outputs()
        self.model_output_names = list(
            map(lambda x: x.name, self.model_outputs))
        model_h_w = self.model_inputs[0].shape
        self._model_ = loaded_model
        self.model_type: str = loaded_model.get_modelmeta().description
        self.model_type = self.model_type.replace(" ", "_")
        self._width_ = (model_h_w[3]
                        if self.model_type != "object_detection" else 640)
        self._height_ = (model_h_w[2]
                         if self.model_type != "object_detection" else 640)
        self.processor: AbstractProcessor = importlib.import_module(
            f"server.utilities.onnx_models.{self.model_type}").Processor()
        # run cold start
        random_image = np.random.random_integers(
            0, 255, (self._height_, self._width_, 3))
        random_image = self.processor.preprocess(random_image)
        self.feed_forward(random_image)

    def predict(self, image_array):

        image_array = cv2.resize(image_array, (self._width_, self._height_))
        if self._model_ is None:
            raise PortalError(Errors.NOTFOUND, "Model is not Loaded")
        try:
            image_array = self.processor.preprocess(image_array)
            detections = self.feed_forward(image_array)
            prediction_dict = self.processor.postprocess(
                detections,
                model_output_names=self.model_output_names,
                height=self._height_,
                width=self._width_,
                category_map=self.category_map)
            return prediction_dict

        except Exception as e:
            print(e)
            raise PortalError(Errors.FAILEDPREDICTION, str(e)) from e
