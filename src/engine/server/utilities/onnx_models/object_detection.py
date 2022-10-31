from copy import deepcopy
from typing import List, Dict

import numpy as np
import tensorflow as tf

from server.utilities.onnx_models.abstract import AbstractProcessor


def reframe_box_masks_to_image_masks(box_masks,
                                     boxes,
                                     image_height,
                                     image_width,
                                     resize_method="bilinear"):
    """Transform the box masks back to full image masks.

    Embeds masks in bounding boxes of larger masks whose shapes correspond to
    image shape.
    Args:
        box_masks: A tensor of size [num_masks, mask_height, mask_width].
        boxes: A tf.float32 tensor of size [num_masks, 4] containing the box
                corners. Row i contains [ymin, xmin, ymax, xmax] of the box
                corresponding to mask i. Note that the box corners are in
                normalized coordinates.
        image_height: Image height. The output mask will have the same
                        height as the image height.
        image_width: Image width. The output mask will have the same
                        width as the image width.
        resize_method: The resize method, either 'bilinear' or 'nearest'.
            Note that 'bilinear' is only respected if box_masks is a float.
    Returns:
        A tensor of size [num_masks, image_height, image_width]
        with the same dtypeas `box_masks`.
    """
    box_masks = tf.convert_to_tensor(box_masks)
    boxes = tf.convert_to_tensor(boxes)
    resize_method = "nearest" if box_masks.dtype == tf.uint8 else resize_method

    def _reframe_box_masks_to_image_masks_default():
        """Apply function when there are more than 0 box masks."""

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
            [tf.zeros([num_boxes, 2]),
             tf.ones([num_boxes, 2])], 1)
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
        _reframe_box_masks_to_image_masks_default,
        lambda: tf.zeros([0, image_height, image_width, 1], box_masks.dtype),
    )
    output = tf.squeeze(image_masks, axis=3)
    output = tf.cast(output > 0.5, tf.uint8)
    output = output.numpy()
    return output


class Processor(AbstractProcessor):

    @property
    def processor_type(self):
        return "object_detection"

    def preprocess(self, model_input: np.ndarray) -> np.ndarray:
        print(model_input.shape)
        model_input = model_input.astype(np.uint8)
        return model_input

    def postprocess(self, model_output: List[np.ndarray],
                    model_output_names: List[str]) -> Dict:
        # Using them, get the indices of the important outputs.
        id_name_dict = {
            name: num
            for num, name in enumerate(model_output_names)
        }
        original_bboxes = model_output[
            id_name_dict["detection_boxes"]].squeeze()
        # Convert squeezed_bboxes
        converted_bboxes = deepcopy(original_bboxes)
        # print(converted_bboxes)
        # from ymin xmin ymax xmax to xmin ymin xmax ymax
        # converted_bboxes[:, [0, 1, 2, 3]] = converted_bboxes[:, [1, 0, 3, 2]]

        classes = model_output[id_name_dict["detection_classes"]].astype(
            np.uint8).squeeze().tolist()
        scores = model_output[id_name_dict["detection_scores"]].astype(
            np.float32).squeeze().tolist()
        # Get the respective return dict
        return_dict = {
            "detection_boxes": converted_bboxes.tolist(),
            "detection_classes": classes,
            "detection_scores": scores
        }
        if "detection_masks" in id_name_dict:
            box_masks = model_output[id_name_dict["detection_masks"]].squeeze()
            instance_masks = reframe_box_masks_to_image_masks(
                box_masks, original_bboxes, 640, 640)
            return_dict["detection_masks"] = instance_masks
        return return_dict
