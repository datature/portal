#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   utils.py
@Author  :   Marcus Neo
@Version :   0.5.7
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing utilities for models.
'''
from typing import List, Tuple

import cv2
import numpy as np
import tensorflow as tf


def reframe_box_masks_to_image_masks(box_masks,
                                     boxes,
                                     image_height,
                                     image_width,
                                     resize_method="bilinear"):
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
      resize_method: The resize method, either 'bilinear' or 'nearest'.
                     Note that 'bilinear' is only respected if box_masks
                     is a float.
    Returns:
      A tensor of size [num_masks, image_height, image_width]
      with the same dtype as `box_masks`.
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
        __reframe_box_masks_to_image_masks_default,
        lambda: tf.zeros([0, image_height, image_width, 1], box_masks.dtype),
    )
    return tf.squeeze(image_masks, axis=3)


def get_polygons(
    mask: np.ndarray
) -> (Tuple[List[np.ndarray], List[List[float]], List[int], List[float]]):
    """Convert AutoDetect Model semantic segmentation output to polygons.

        Arguments:
            mask:   Probability map with shape [num_classes, height, width].

        Return:
            Tuple containing polygon masks and their respective bounding boxes,
            labels and confidences.

        NOTE: num_classes includes the background class indexed at 0.
              This will be filtered out within this function.
    """
    height = mask.shape[1]
    width = mask.shape[2]
    mask_list = []
    class_list = []
    scores_list = []
    bbox_list = []
    # Step 2: for each class mask, convert to polygons
    normalized_mask = (mask - np.min(mask)) / (np.max(mask) - np.min(mask))
    for class_id, (class_mask, normalized_class_mask) in enumerate(
            zip(mask, normalized_mask)):
        if class_id > 0:
            background_class = np.zeros_like(class_mask, np.uint8)

            background_class[np.where(class_mask > 0.0)] = 1
            contours, _ = cv2.findContours(
                background_class,
                cv2.RETR_LIST,
                cv2.CHAIN_APPROX_NONE,
            )
            if contours:
                for cnt_id, contour in enumerate(contours):
                    if len(contour) > 1:
                        instance = np.zeros_like(class_mask, np.uint8)
                        cv2.drawContours(instance, contours, cnt_id, 1, -1)
                        total_area = np.count_nonzero(instance)
                        total_score = np.sum(
                            normalized_class_mask[np.where(instance > 0)])
                        average_score = total_score / total_area
                        contour = tuple((cnt[0][1] / width, cnt[0][0] / height)
                                        for cnt in contour.tolist())
                        y_coordinates, x_coordinates = zip(*contour)
                        xmin = min(x_coordinates)
                        ymin = min(y_coordinates)
                        xmax = max(x_coordinates)
                        ymax = max(y_coordinates)
                        bbox_list.append([xmin, ymin, xmax, ymax])
                        mask_list.append(instance.tolist())
                        class_list.append(class_id)
                        scores_list.append(average_score)
    return mask_list, bbox_list, class_list, scores_list
