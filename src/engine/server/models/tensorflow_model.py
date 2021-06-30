import os

import cv2
import numpy as np
import tensorflow as tf

# pylint: disable=E0401, E0611
from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models._BaseModel import Model


class TensorflowModel(Model):
    def _load_label_map_(self):
        self._label_map_ = {}
        with open(
            os.path.join(self._directory_, "label_map.pbtxt"),
            "r",
        ) as label_file:
            for line in label_file:
                if "id" in line:
                    label_index = int(line.split(":")[-1])
                    label_name = (
                        next(label_file).split(":")[-1].strip().strip("'")
                    )
                    self._label_map_[str(label_index)] = {
                        "id": label_index,
                        "name": label_name,
                    }

    def register(self):
        if not os.path.isfile(
            os.path.join(self._directory_, "label_map.pbtxt")
        ):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "label_map.pbtxt is not found in given directory.",
            )
        if not (
            os.path.isfile(
                os.path.join(
                    self._directory_, "saved_model", "saved_model.pbtxt"
                )
            )
            or os.path.isfile(
                os.path.join(self._directory_, "saved_model", "saved_model.pb")
            )
        ):
            raise PortalError(
                Errors.INVALIDFILEPATH,
                "saved_model/{saved_model.pb|saved_model.pbtxt} is not found in given directory",
            )

        self._height_ = 1024 if self._height_ is None else self._height_
        self._width_ = 1024 if self._width_ is None else self._width_
        self._load_label_map_()
        self._key_ = get_hash(self._directory_)
        return self._key_, self

    def load(self):
        loaded_model = tf.saved_model.load(
            os.path.join(self._directory_, "saved_model")
        )
        return loaded_model

    def predict(self, model, image_array):
        image_tensor = tf.convert_to_tensor(
            cv2.resize(
                image_array,
                (self._height_, self._width_),
            )
        )[tf.newaxis, ...]
        try:
            detections = model(image_tensor)
            for key, value in detections.items():
                detections[key] = np.squeeze(value.numpy())
            return detections
        except Exception as e:  # pylint: disable=broad-except
            raise PortalError(Errors.FAILEDPREDICTION, str(e)) from e
