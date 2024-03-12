#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   autodetect_model.py
@Author  :   Marcus Neo
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the AutoDetect Model class.
"""
import os
import sys

import numpy as np
import tensorflow as tf
from PIL import Image
from server.models.abstract.BaseModel import BaseModel
from server.models.model_utils import (
    MODEL_FORMATS,
    get_polygons,
    infer_input_details,
    infer_model_type_and_path,
    onnx_predict,
    reframe_box_masks_to_image_masks,
    tf_predict,
    tflite_predict,
    torch_predict,
    yolov8_predict,
)
from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash


class AutoDetectModel(BaseModel):
    """Implementation of the AutoDetect Model.

    Inherits from BaseModel.
    Supports the following model formats:
        1. TensorFlow SavedModel format
        2. PyTorch GraphModule format
        3. ONNX
        4. TFLite
        5. Ultralytics YOLOv8

    The following are the model output formats for the different model types:

        Bounding box models output format has shape [N x 7] defined by:
            [ ymin, xmin, ymax, xmax, score, class, valid ]
            Applicable for all model formats except TFLite.

        TFLite bounding box model output format is the following dictionary:
            {
                "<output_0>": number of valid detections (List[List[int]]),
                "<output_1>": the detection scores (List[List[float]]),
                "<output_2>": the detection labels (List[List[int]]),
                "<output_3>": the bounding boxes (List[List[List[float]]]),
            }
            The dictionary keys are not important and can be any string, but
            the fields have to be in this specific order.
            the first dimension of the output is empty and can be squeezed.

        Semantic segmentation models output format
        is a probability map with shape [num_classes x height x width].
            Applicable for all model formats except TFLite.

        TFLite semantic segmentation model format is the following dictionary:
            {
                "output": [prob map with shape [num_classes x height x width]]
            }

        Instance segmentation ONNX models output format is the tuple:
            (num_detections, scores, classes, boxes, masks)

        Instance segmentation TensorFlow and TFLite model output format is the
        dictionary:
            {
                "output_0": num_detections (tf.Tensor with shape (1,)),
                "output_1": scores (tf.Tensor with shape (1,)),
                "output_2": classes (tf.Tensor with shape (1,)),
                "output_3": boxes (tf.Tensor with shape (1, num_boxes, 4)),
                "output_4": masks (tf.Tensor with shape (1, num_masks, x)),
            }

        Instance segmentation currently not supported for PyTorch GraphModule.

        YOLOv8 model output format for both bounding box and
        instance segmentation is the following dictionary:
            {
                "boxes": {
                    "xyxyn": [N x 4] bounding boxes in normalized
                             [x1, y1, x2, y2] format,
                    "cls": [N] integer class IDs,
                    "conf": [N] confidence scores,
                },
                "masks": {
                    "data": {
                        [N x 1 x H x W] segmentation masks,
                    },
                }
            }
    """

    def _load_label_map_(self):
        """Overloaded from Parent Class."""
        self._label_map_ = {}
        label_file = "label.txt" if self._model_type_ == "tflite" else "label_map.pbtxt"
        with open(
            os.path.join(self._directory_, label_file), "r", encoding="utf-8"
        ) as label_file:
            for line in label_file:
                if "id" in line:
                    label_index = int(line.split(":")[-1])
                    label_name = next(label_file).split(":")[-1].strip().strip("'")
                    self._label_map_[str(label_index)] = {
                        "id": label_index,
                        "name": label_name,
                    }

    def register(self):
        """Overloaded from Parent Class."""
        folder_contents = os.listdir(self._directory_)
        try:
            self._model_type_, self._model_path_ = infer_model_type_and_path(
                self._directory_, folder_contents
            )
        except Exception as e:
            raise PortalError(Errors.INVALIDTYPE, str(e)) from e
        self._height_, self._width_, info_line = infer_input_details(
            os.path.join(self._directory_, "predict.py")
        )
        self._model_format_ = next((x for x in MODEL_FORMATS if x in info_line), None)
        self._load_label_map_()
        self._key_ = get_hash(self._directory_)
        return self._key_, self

    def load(self):
        """Overloaded from Parent Class."""
        sys.path.append(self._directory_)
        if self._model_type_ == "pytorch":
            import torch

            self._model_ = torch.load(self._model_path_)
        elif self._model_type_ == "onnx":
            import onnxruntime as ort

            self._model_ = ort.InferenceSession(self._model_path_)
            if self._model_format_ == "instance":
                self._input_name = self._model_.get_inputs()[0].name
                model_outputs = self._model_.get_outputs()
                self._output_name = list(map(lambda x: x.name, model_outputs))
            else:
                self._input_name = self._model_.get_inputs()[0].name
                self._output_name = self._model_.get_outputs()[0].name
        elif self._model_type_ == "tflite":
            interpreter = tf.lite.Interpreter(self._model_path_)
            self._model_ = interpreter.get_signature_runner()
        elif self._model_type_ == "tensorflow":
            loaded = tf.saved_model.load(self._model_path_)
            self._model_ = loaded.signatures["serving_default"]
            self._output_name = list(self._model_.structured_outputs.keys())[0]
        elif self._model_type_ == "yolov8":
            from ultralytics import YOLO

            self._model_ = YOLO(self._model_path_)

    def predict(self, image_array):
        """Overloaded from Parent Class."""
        try:
            if self._model_type_ == "yolov8":
                return yolov8_predict(
                    self._model_, image_array, (self._height_, self._width_)
                )
            image_array = np.expand_dims(
                np.array(
                    Image.fromarray(image_array).resize((self._width_, self._height_))
                ).astype(np.float32),
                0,
            )
            if self._model_type_ == "onnx":
                detections_output = onnx_predict(
                    self._model_,
                    self._model_format_,
                    self._input_name,
                    self._output_name,
                    image_array,
                )
            elif self._model_type_ == "tflite":
                detections_output = tflite_predict(
                    self._model_, self._model_format_, image_array
                )
            elif self._model_type_ == "pytorch":
                detections_output = torch_predict(self._model_, image_array)
            elif self._model_type_ == "tensorflow":
                detections_output = tf_predict(
                    self._model_, self._model_format_, self._output_name, image_array
                )
            return self.postprocess(detections_output)
        except Exception as e:
            raise PortalError(Errors.FAILEDPREDICTION, str(e)) from e

    def postprocess(self, detections_output):
        detections = {}
        if self._model_format_ == "bounding box":
            # Filter detections
            slicer = detections_output[:, -1]
            output = detections_output[:, :6][slicer != 0]
            scores = output[:, 4]
            classes = output[:, 5]
            output = output[classes != 0]

            # Postprocess detections
            bboxes = output[:, :4]
            classes = output[:, 5].astype(np.int32)
            scores = output[:, 4]  # y1, x1, y2, x2
            detections["detection_masks"] = None

        elif self._model_format_ == "semantic":
            mask_list, bbox_list, class_list, scores_list = get_polygons(
                detections_output
            )
            bboxes = np.array(bbox_list)
            classes = np.array(class_list)
            masks = np.array(mask_list)
            scores = np.array(scores_list)
            detections["detection_masks"] = masks

        elif self._model_format_ == "instance":
            bboxes, masks, scores, classes = detections_output
            scores = scores[0]
            classes = classes[0].astype(np.int16)
            bboxes = bboxes[0]
            masks = masks[0]
            image_masks = reframe_box_masks_to_image_masks(
                tf.convert_to_tensor(masks), bboxes, self._height_, self._width_
            )
            image_masks = tf.cast(image_masks > 0.5, tf.uint8).numpy()

            detections["detection_masks"] = image_masks

        detections["detection_boxes"] = bboxes
        detections["detection_scores"] = scores
        detections["detection_classes"] = classes
        return detections
