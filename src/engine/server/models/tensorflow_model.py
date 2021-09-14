import os

import cv2
import numpy as np
import tensorflow as tf

# pylint: disable=E0401, E0611
from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models.abstract.BaseModel import BaseModel


def _reframe_box_masks_to_image_masks(
    box_masks, boxes, image_height, image_width, resize_method="bilinear"
):
    """Transforms the box masks back to full image masks.
    Embeds masks in bounding boxes of larger masks whose shapes correspond to
    image shape.
    Args:
      box_masks: A tensor of size [num_masks, mask_height, mask_width].
      boxes: A tf.float32 tensor of size [num_masks, 4] containing the box
             corners. Row i contains [ymin, xmin, ymax, xmax] of the box
             corresponding to mask i. Note that the box corners are in
             normalized coordinates.
      image_height: Image height. The output mask will have the same height as
                    the image height.
      image_width: Image width. The output mask will have the same width as the
                   image width.
      resize_method: The resize method, either 'bilinear' or 'nearest'. Note that
        'bilinear' is only respected if box_masks is a float.
    Returns:
      A tensor of size [num_masks, image_height, image_width] with the same dtype
      as `box_masks`.
    """
    resize_method = "nearest" if box_masks.dtype == tf.uint8 else resize_method

    def __reframe_box_masks_to_image_masks_default():
        """The default function when there are more than 0 box masks."""

        def transform_boxes_relative_to_boxes(boxes, reference_boxes):
            boxes = tf.reshape(boxes, [-1, 2, 2])
            min_corner = tf.expand_dims(reference_boxes[:, 0:2], 1)
            max_corner = tf.expand_dims(reference_boxes[:, 2:4], 1)
            denom = max_corner - min_corner
            # Prevent a divide by zero.
            denom = tf.math.maximum(denom, 1e-4)
            transformed_boxes = (boxes - min_corner) / denom
            return tf.reshape(transformed_boxes, [-1, 4])

        box_masks_expanded = tf.expand_dims(box_masks, axis=3)
        num_boxes = tf.shape(box_masks_expanded)[0]
        unit_boxes = tf.concat(
            [tf.zeros([num_boxes, 2]), tf.ones([num_boxes, 2])], 1
        )
        reverse_boxes = transform_boxes_relative_to_boxes(unit_boxes, boxes)

        resized_crops = tf.image.crop_and_resize(
            box_masks_expanded,
            reverse_boxes,
            tf.range(num_boxes),
            [image_height, image_width],
            method=resize_method,
            extrapolation_value=0,
        )
        return tf.cast(resized_crops, box_masks.dtype)

    image_masks = tf.cond(
        tf.shape(box_masks)[0] > 0,
        __reframe_box_masks_to_image_masks_default,
        lambda: tf.zeros([0, image_height, image_width, 1], box_masks.dtype),
    )
    return tf.squeeze(image_masks, axis=3)


class TensorflowModel(BaseModel):
    def _load_label_map_(self):
        self._label_map_ = {}
        with open(
            os.path.join(self._directory_, "label_map.pbtxt"),
            "r",
            encoding="UTF8",
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
        self._model_ = loaded_model

    def predict(self, image_array):
        height, width, _ = image_array.shape
        if self._model_ is None:
            raise PortalError(Errors.NOTFOUND, "Model is not Loaded")
        model = self._model_
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
            if "detection_masks" in detections:
                box_masks = detections["detection_masks"]
                boxes = detections["detection_boxes"]
                image_masks = _reframe_box_masks_to_image_masks(
                    tf.convert_to_tensor(box_masks), boxes, height, width
                )
                image_masks = tf.cast(image_masks > 0.5, tf.uint8).numpy()
                detections["detection_masks"] = image_masks
            return detections
        except Exception as e:  # pylint: disable=broad-except
            raise PortalError(Errors.FAILEDPREDICTION, str(e)) from e
