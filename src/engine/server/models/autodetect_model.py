#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   autodetect_model.py
@Author  :   Marcus Neo
@Version :   0.5.6
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the AutoDetect Model class.
'''
import ast
import os

from PIL import Image
import numpy as np
import tensorflow as tf

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models.abstract.BaseModel import BaseModel
from server.models.model_utils import reframe_box_masks_to_image_masks
from server.models.model_utils import get_polygons


class AutoDetectModel(BaseModel):
    """Implementation of the AutoDetect Model.

    Inherits from BaseModel.
    Supports the following model formats:
        1. TensorFlow SavedModel format
        2. PyTorch GraphModule format
        3. ONNX
        4. TFLite

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
    """

    def _load_label_map_(self):
        """Overloaded from Parent Class."""
        self._label_map_ = {}
        label_file = ("label.txt"
                      if self.model_type == "tflite" else "label_map.pbtxt")
        with open(
                os.path.join(self._directory_, label_file),
                "r",
        ) as label_file:
            for line in label_file:
                if "id" in line:
                    label_index = int(line.split(":")[-1])
                    label_name = (
                        next(label_file).split(":")[-1].strip().strip("'"))
                    self._label_map_[str(label_index)] = {
                        "id": label_index,
                        "name": label_name,
                    }

    def register(self):
        """Overloaded from Parent Class."""
        folder_contents = os.listdir(self._directory_)
        if "model.pth" in folder_contents:
            self.model_type = "pytorch"
        elif "model.onnx" in folder_contents:
            self.model_type = "onnx"
        elif "model.tflite" in folder_contents:
            self.model_type = "tflite"
        elif "saved_model" in folder_contents:
            self.model_type = "tensorflow"
        else:
            raise PortalError(Errors.INVALIDTYPE,
                              "Detected Model Output Format Not Supported.")
        with open(os.path.join(self._directory_, "predict.py"),
                  "r") as predictor_file:
            lines = predictor_file.readlines()
        info_line = list(filter(lambda x: "@Desc" in x, lines))[0]
        self._height_, self._width_ = ast.literal_eval(
            list(filter(lambda x: "HEIGHT, WIDTH" in x,
                        lines))[0].replace("HEIGHT, WIDTH = ", ""))
        self.model_format = [
            x for x in ["semantic", "instance", "bounding box"]
            if x in info_line
        ][0]
        self._load_label_map_()
        self._key_ = get_hash(self._directory_)
        return self._key_, self

    def load(self):
        """Overloaded from Parent Class."""
        if self.model_type == "pytorch":
            import sys
            import torch
            sys.path.append(self._directory_)
            self._model_ = torch.load(
                os.path.join(self._directory_, "model.pth"))
        elif self.model_type == "onnx":
            import onnxruntime as ort
            self._model_ = ort.InferenceSession(
                os.path.join(self._directory_, "model.onnx"))
            if self.model_format == "instance":
                self._input_name = self._model_.get_inputs()[0].name
                model_outputs = self._model_.get_outputs()
                self._output_name = list(map(lambda x: x.name, model_outputs))
            else:
                self._input_name = self._model_.get_inputs()[0].name
                self._output_name = self._model_.get_outputs()[0].name
        elif self.model_type == "tflite":
            import tensorflow as tf
            interpreter = tf.lite.Interpreter(
                os.path.join(self._directory_, "model.tflite"))
            self._model_ = interpreter.get_signature_runner()
        elif self.model_type == "tensorflow":
            import tensorflow as tf
            loaded = tf.saved_model.load(
                os.path.join(self._directory_, "saved_model"))
            self._model_ = loaded.signatures["serving_default"]
            self._output_name = list(self._model_.structured_outputs.keys())[0]

    def predict(self, image_array):
        """Overloaded from Parent Class."""
        detections = {}
        try:
            image_array = np.expand_dims(
                np.array(
                    Image.fromarray(image_array).resize(
                        (self._width_, self._height_))).astype(np.float32), 0)
            if self.model_type == "onnx":
                if self.model_format == "instance":
                    detections_output = self._model_.run(
                        self._output_name, {self._input_name: image_array})
                    _, scores, classes, bboxes, masks = detections_output
                    detections_output = bboxes, masks, scores, classes

                else:
                    detections_output = self._model_.run(
                        [self._output_name], {self._input_name: image_array})
                    detections_output = detections_output[0][0]
            elif self.model_type == "tflite":
                detections_output = self._model_(inputs=image_array)
                if self.model_format == "bounding box":
                    _, scores, classes, boxes = list(
                        detections_output.values())
                    if len(boxes.shape) >= 3:
                        boxes = np.squeeze(boxes, axis=0)
                        scores = np.squeeze(scores, axis=0)
                        classes = np.squeeze(classes, axis=0)
                    detections_output = np.c_[boxes, scores, classes,
                                              np.ones_like(classes)]
                elif self.model_format == "instance":
                    scores = np.array(detections_output["output_1"])
                    classes = np.array(detections_output["output_2"]).astype(
                        np.int16)
                    bboxes = np.array(detections_output["output_3"])
                    masks = np.array(detections_output["output_4"])
                    detections_output = bboxes, masks, scores, classes
                elif self.model_format == "semantic":
                    detections_output = detections_output["output"][0]
                else:
                    raise ValueError(self.model_format)
            elif self.model_type == "pytorch":
                import torch
                detections_output = self._model_(torch.Tensor(image_array))
                detections_output = detections_output[0].detach().numpy()
            elif self.model_type == "tensorflow":
                detections_output = self._model_(inputs=image_array)
                if self.model_format == "instance":
                    bboxes = detections_output["output_3"].numpy()
                    masks = detections_output["output_4"].numpy()
                    scores = detections_output["output_1"].numpy()
                    classes = detections_output["output_2"].numpy().astype(
                        np.int16)
                    detections_output = bboxes, masks, scores, classes
                else:
                    detections_output = np.array(
                        detections_output[self._output_name][0])

            if self.model_format == "bounding box":
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

            elif self.model_format == "semantic":
                mask_list, bbox_list, class_list, scores_list = get_polygons(
                    detections_output)
                bboxes = np.array(bbox_list)
                classes = np.array(class_list)
                masks = np.array(mask_list)
                scores = np.array(scores_list)
                detections["detection_masks"] = masks

            elif self.model_format == "instance":
                bboxes, masks, scores, classes = detections_output
                scores = scores[0]
                classes = classes[0].astype(np.int16)
                bboxes = bboxes[0]
                masks = masks[0]
                image_masks = reframe_box_masks_to_image_masks(
                    tf.convert_to_tensor(masks), bboxes, self._height_,
                    self._width_)
                image_masks = tf.cast(image_masks > 0.5, tf.uint8).numpy()

                detections["detection_masks"] = image_masks

            detections["detection_boxes"] = bboxes
            detections["detection_scores"] = scores
            detections["detection_classes"] = classes
            return detections
        except Exception as e:
            raise PortalError(Errors.FAILEDPREDICTION, str(e))
