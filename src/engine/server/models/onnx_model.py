import copy
from copy import deepcopy
import os
from typing import List, Dict

import cv2
import numpy as np
import onnxruntime as ort
from scipy.special import expit
import tensorflow as tf
import torch
import torchvision

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash
from server.models.abstract.BaseModel import BaseModel

ANCHORS = np.array([[12., 16.], [19., 36.], [40., 28.], [36., 75.], [76., 55.],
                    [72., 146.], [142., 110.], [192., 243.], [459., 401.]])


def yolo_decode(
    prediction,
    anchors,
    num_classes,
    input_shape,
):
    """Decode final layer features to bounding box parameters."""
    batch_size = np.shape(prediction)[0]
    num_anchors = len(anchors)
    grid_shape = np.shape(prediction)[1:3]

    # Check if stride on height & width are same
    assert (input_shape[0] // grid_shape[0] == input_shape[1] //
            grid_shape[1]), "model stride mismatch."

    prediction = np.reshape(
        prediction,
        (
            batch_size,
            grid_shape[0] * grid_shape[1] * num_anchors,
            num_classes + 5,
        ),
    )

    # Generate x_y_offset grid map
    grid_y = np.arange(grid_shape[0])
    grid_x = np.arange(grid_shape[1])
    x_offset, y_offset = np.meshgrid(grid_x, grid_y)

    x_offset = np.reshape(x_offset, (-1, 1))
    y_offset = np.reshape(y_offset, (-1, 1))

    x_y_offset = np.concatenate((x_offset, y_offset), axis=1)
    x_y_offset = np.tile(x_y_offset, (1, num_anchors))
    x_y_offset = np.reshape(x_y_offset, (-1, 2))
    x_y_offset = np.expand_dims(x_y_offset, 0)

    # Log space transform of the height and width
    anchors = np.tile(anchors, (grid_shape[0] * grid_shape[1], 1))
    anchors = np.expand_dims(anchors, 0)

    # Eliminate grid sensitivity
    box_xy = (expit(prediction[..., :2]) +
              x_y_offset) / np.array(grid_shape)[::-1]

    box_wh = (np.exp(prediction[..., 2:4]) *
              anchors) / np.array(input_shape)[::-1]

    # Sigmoid objectness scores
    objectness = expit(prediction[..., 4])
    objectness = np.expand_dims(objectness, -1)

    # Sigmoid class scores
    class_scores = expit(prediction[..., 5:])

    return np.concatenate([box_xy, box_wh, objectness, class_scores], axis=2)


def yolov3v4_decode(
    predictions,
    anchors,
    num_classes,
    input_shape,
):
    """
    YOLOv3/v4 Head to process predictions from YOLOv3/v4 models

    Args:
        num_classes: Total number of classes
        anchors: YOLO style anchor list for bounding box assignment
        input_shape: Input shape of the image
        predictions: A list of three tensors with shape
            (N, 19, 19, 255), (N, 38, 38, 255) and (N, 76, 76, 255)

    Returns:
        A tensor with the shape (N, num_boxes, 85)
    """
    assert (len(predictions) == len(anchors) //
            3), "Anchor numbers does not match prediction."

    if len(predictions) == 3:
        anchor_mask = [[6, 7, 8], [3, 4, 5], [0, 1, 2]]
    elif len(predictions) == 2:
        anchor_mask = [[3, 4, 5], [0, 1, 2]]
    else:
        raise ValueError("Unsupported prediction length: {}".format(
            len(predictions)))

    results = []

    for idx, prediction in enumerate(predictions):
        results.append(
            yolo_decode(
                prediction,
                anchors[anchor_mask[idx]],
                num_classes,
                input_shape,
            ))

    return np.concatenate(results, axis=1)


def yolo_correct_boxes(predictions, img_shape, model_input_shape):
    """Rescale predicition boxes back to original image shape"""
    box_xy = predictions[..., :2]
    box_wh = predictions[..., 2:4]
    objectness = np.expand_dims(predictions[..., 4], -1)
    class_scores = predictions[..., 5:]

    # Model_input_shape & image_shape should be (height, width) format
    model_input_shape = np.array(model_input_shape, dtype="float32")
    image_shape = np.array(img_shape, dtype="float32")

    new_shape = np.round(image_shape * np.min(model_input_shape / image_shape))
    offset = (model_input_shape - new_shape) / 2.0 / model_input_shape
    scale = model_input_shape / new_shape
    # Reverse offset/scale to match (w,h) order
    offset = offset[..., ::-1]
    scale = scale[..., ::-1]

    box_xy = (box_xy - offset) * scale
    box_wh *= scale

    # Convert centoids to top left coordinates
    box_xy -= box_wh / 2

    # Scale boxes back to original image shape.
    image_wh = image_shape[..., ::-1]
    box_xy *= image_wh
    box_wh *= image_wh

    return np.concatenate([box_xy, box_wh, objectness, class_scores], axis=2)


def box_diou(boxes):
    """
    Calculate DIoU value of 1st box with other boxes of a box array

    Args:
        boxes:  bbox numpy array, shape=(N, 4), xywh
                x,y are top left coordinates

    Returns:
        numpy array, shape=(N-1,)
        IoU value of boxes[1:] with boxes[0]
    """
    # get box coordinate and area
    x = boxes[:, 0]
    y = boxes[:, 1]
    w = boxes[:, 2]
    h = boxes[:, 3]
    areas = w * h

    # check IoU
    inter_xmin = np.maximum(x[1:], x[0])
    inter_ymin = np.maximum(y[1:], y[0])
    inter_xmax = np.minimum(x[1:] + w[1:], x[0] + w[0])
    inter_ymax = np.minimum(y[1:] + h[1:], y[0] + h[0])

    inter_w = np.maximum(0.0, inter_xmax - inter_xmin + 1)
    inter_h = np.maximum(0.0, inter_ymax - inter_ymin + 1)

    inter = inter_w * inter_h
    iou = inter / (areas[1:] + areas[0] - inter)

    # box center distance
    x_center = x + w / 2
    y_center = y + h / 2
    center_distance = np.power(x_center[1:] - x_center[0], 2) + np.power(
        y_center[1:] - y_center[0], 2)

    # get enclosed area
    enclose_xmin = np.minimum(x[1:], x[0])
    enclose_ymin = np.minimum(y[1:], y[0])
    enclose_xmax = np.maximum(x[1:] + w[1:], x[0] + w[0])
    enclose_ymax = np.maximum(x[1:] + w[1:], x[0] + w[0])
    enclose_w = np.maximum(0.0, enclose_xmax - enclose_xmin + 1)
    enclose_h = np.maximum(0.0, enclose_ymax - enclose_ymin + 1)
    # get enclosed diagonal distance
    enclose_diagonal = np.power(enclose_w, 2) + np.power(enclose_h, 2)
    # calculate DIoU, add epsilon in denominator to avoid dividing by 0
    diou = iou - 1.0 * (center_distance) / (enclose_diagonal +
                                            np.finfo(float).eps)

    return diou


def nms_boxes(
    boxes,
    classes,
    scores,
    iou_threshold,
):
    """Non-max supression function for bounding boxes."""
    nboxes, nclasses, nscores = [], [], []
    for c in set(classes):
        # Handle data for one class
        inds = np.where(classes == c)
        b = boxes[inds]
        c = classes[inds]
        s = scores[inds]

        # Make a data copy to avoid breaking during nms operation
        b_nms = copy.deepcopy(b)
        c_nms = copy.deepcopy(c)
        s_nms = copy.deepcopy(s)

        while len(s_nms) > 0:
            # Store the box with the max score.
            i = np.argmax(s_nms, axis=-1)
            nboxes.append(copy.deepcopy(b_nms[i]))
            nclasses.append(copy.deepcopy(c_nms[i]))
            nscores.append(copy.deepcopy(s_nms[i]))

            # Swap the max line and first line
            b_nms[[i, 0], :] = b_nms[[0, i], :]
            c_nms[[i, 0]] = c_nms[[0, i]]
            s_nms[[i, 0]] = s_nms[[0, i]]

            iou = box_diou(b_nms)

            # Drop the last line since it has been record
            b_nms = b_nms[1:]
            c_nms = c_nms[1:]
            s_nms = s_nms[1:]

            keep_mask = np.where(iou <= iou_threshold)[0]

            # Keep needed box for next loop
            b_nms = b_nms[keep_mask]
            c_nms = c_nms[keep_mask]
            s_nms = s_nms[keep_mask]

    # Reformat result for output
    nboxes = [np.array(nboxes)]
    nclasses = [np.array(nclasses)]
    nscores = [np.array(nscores)]
    return nboxes, nclasses, nscores


def filter_boxes(boxes, classes, scores, max_boxes):
    """Sort the prediction boxes according to score
    and only pick top "max_boxes" ones
    """
    # sort result according to scores
    sorted_indices = np.argsort(scores)
    sorted_indices = sorted_indices[::-1]
    nboxes = boxes[sorted_indices]
    nclasses = classes[sorted_indices]
    nscores = scores[sorted_indices]

    # only pick max_boxes
    nboxes = nboxes[:max_boxes]
    nclasses = nclasses[:max_boxes]
    nscores = nscores[:max_boxes]

    return nboxes, nclasses, nscores


def yolo_handle_predictions(predictions,
                            num_classes,
                            max_boxes=100,
                            confidence=0.1,
                            iou_threshold=0.4):
    """Apply NMS algorithm & filter top max boxes."""
    boxes = predictions[:, :, :4]
    box_confidences = np.expand_dims(predictions[:, :, 4], -1)
    box_class_probs = predictions[:, :, 5:]

    # Check if only 1 class for different score
    if num_classes == 1:
        box_scores = box_confidences
    else:
        box_scores = box_confidences * box_class_probs

    # Filter boxes with score threshold
    box_classes = np.argmax(box_scores, axis=-1)
    box_class_scores = np.max(box_scores, axis=-1)
    pos = np.where(box_class_scores >= float(confidence))

    boxes = boxes[pos]
    classes = box_classes[pos]
    scores = box_class_scores[pos]

    # Boxes, Classes and Scores returned from NMS
    n_boxes, n_classes, n_scores = nms_boxes(
        boxes,
        classes,
        scores,
        iou_threshold,
    )

    if n_boxes:
        boxes = np.concatenate(n_boxes)
        classes = np.concatenate(n_classes).astype("int32")
        scores = np.concatenate(n_scores)
        boxes, classes, scores = filter_boxes(boxes, classes, scores,
                                              max_boxes)

        return boxes, classes, scores

    return [], [], []


def yolo_adjust_boxes(boxes, img_shape):
    """Change box format from (x,y,w,h) top left coordinate to
    (xmin,ymin,xmax,ymax) format
    """
    if boxes is None or len(boxes) == 0:
        return []

    image_shape = np.array(img_shape, dtype="float32")
    height, width = image_shape

    adjusted_boxes = []
    for box in boxes:
        x, y, w, h = box

        xmin = min(max(0, x / width), 1)
        ymin = min(max(0, y / height), 1)
        xmax = min(max(xmin, (x + w) / width), 1)
        ymax = min(max(ymin, (y + h) / height), 1)

        adjusted_boxes.append([xmin, ymin, xmax, ymax])

    return np.array(adjusted_boxes, dtype=np.float32)


def yolov3v4_postprocess(
    yolo_outputs,
    image_shape,
    anchors,
    num_classes,
    model_input_shape,
    max_boxes=100,
    confidence=0.1,
    iou_threshold=0.4,
):
    predictions = yolov3v4_decode(
        yolo_outputs,
        anchors,
        num_classes,
        input_shape=model_input_shape,
    )

    predictions = yolo_correct_boxes(predictions, image_shape,
                                     model_input_shape)

    boxes, classes, scores = yolo_handle_predictions(
        predictions,
        num_classes,
        max_boxes=max_boxes,
        confidence=confidence,
        iou_threshold=iou_threshold,
    )

    boxes = yolo_adjust_boxes(boxes, image_shape)

    return boxes, classes, scores


def _postprocess(prediction,
                 num_classes,
                 conf_thre=0.7,
                 nms_thre=0.45,
                 class_agnostic=False):
    prediction = torch.Tensor(prediction)
    box_corner = prediction.new(prediction.shape)
    box_corner[:, :, 0] = prediction[:, :, 0] - prediction[:, :, 2] / 2
    box_corner[:, :, 1] = prediction[:, :, 1] - prediction[:, :, 3] / 2
    box_corner[:, :, 2] = prediction[:, :, 0] + prediction[:, :, 2] / 2
    box_corner[:, :, 3] = prediction[:, :, 1] + prediction[:, :, 3] / 2
    prediction[:, :, :4] = box_corner[:, :, :4]

    output = [None for _ in range(len(prediction))]
    for i, image_pred in enumerate(prediction):
        # If none are remaining => process next image
        if not image_pred.size(0):
            continue
        # Get score and class with highest confidence
        class_conf, class_pred = torch.max(image_pred[:, 5:5 + num_classes],
                                           1,
                                           keepdim=True)

        conf_mask = (image_pred[:, 4] * class_conf.squeeze() >=
                     conf_thre).squeeze()
        # Detections ordered as
        # (x1, y1, x2, y2, obj_conf, class_conf, class_pred)
        detections = torch.cat(
            (image_pred[:, :5], class_conf, class_pred.float()), 1)
        detections = detections[conf_mask]
        if not detections.size(0):
            continue
        if class_agnostic:
            nms_out_index = torchvision.ops.nms(
                detections[:, :4],
                detections[:, 4] * detections[:, 5],
                nms_thre,
            )
        else:
            nms_out_index = torchvision.ops.batched_nms(
                detections[:, :4],
                detections[:, 4] * detections[:, 5],
                detections[:, 6],
                nms_thre,
            )
        detections = detections[nms_out_index]
        if output[i] is None:
            output[i] = detections
        else:
            output[i] = torch.cat((output[i], detections))
    return output


def get_polygons(mask: np.ndarray):
    height = mask.shape[1]
    width = mask.shape[2]
    mask_list = []
    class_list = []
    scores_list = []
    bbox_list = []
    # Step 2: for each class mask, convert to polygons

    for class_id, class_mask in enumerate(mask):
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
                            background_class[np.where(instance > 0)])
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


class OnnxModel(BaseModel):

    def postprocess_yolov4(self, model_output: List[np.ndarray]) -> Dict:
        try:
            bboxes, classes, scores = yolov3v4_postprocess(
                model_output, (self._width_, self._height_), ANCHORS,
                len(self.category_map), (self._width_, self._height_))
            offset = 0
        except Exception:
            bboxes, classes, scores = yolov3v4_postprocess(
                model_output, (self._width_, self._height_), ANCHORS,
                len(self.category_map) - 1, (self._width_, self._height_))
            offset = 1

        bboxes = [[
            float(bbox[0]),
            float(bbox[1]),
            float(bbox[2]),
            float(bbox[3]),
        ] for bbox in bboxes]

        bboxes[:, [0, 1, 2, 3]] = bboxes[:, [1, 0, 3, 2]]
        classes = [int(clss + offset)
                   for clss in classes]  # Account for background class
        scores = [float(score) for score in scores]
        return_dict = {
            "detection_boxes": bboxes,
            "detection_classes": classes,
            "detection_scores": scores
        }
        return return_dict

    def postprocess_yolox(self, model_output: List[np.ndarray]) -> Dict:
        model_output = model_output[0]
        post_out = _postprocess(model_output,
                                num_classes=len(self.category_map))
        post_out = post_out[0]
        if post_out is None:
            return_dict = {
                "detection_boxes": [],
                "detection_classes": [],
                "detection_scores": [],
            }
            return return_dict
        bboxes = post_out[:, 0:4].cpu().detach().numpy().astype(np.float64)
        classes = post_out[:, 6].cpu().detach().numpy().astype(np.float64)
        scores = (post_out[:, 4] *
                  post_out[:, 5]).cpu().detach().numpy().astype(np.float64)
        bboxes = [[
            float(bbox[0] / self._height_),
            float(bbox[1] / self._width_),
            float(bbox[2] / self._height_),
            float(bbox[3] / self._width_),
        ] for bbox in bboxes]
        bboxes[:, [0, 1, 2, 3]] = bboxes[:, [1, 0, 3, 2]]
        classes = [int(clss) for clss in classes]
        scores = [float(score) for score in scores]
        return_dict = {
            "detection_boxes": bboxes,
            "detection_classes": classes,
            "detection_scores": scores,
        }
        return return_dict

    def postprocess_deeplabv3(self, model_output: List[np.ndarray]) -> Dict:
        class_masks = model_output[0][0]
        instance_masks, bbox_list, class_ids, scores = get_polygons(
            class_masks)
        bbox_list[:, [0, 1, 2, 3]] = bbox_list[:, [1, 0, 3, 2]]
        return_dict = {
            "detection_classes": class_ids,
            "detection_scores": scores,
            "detection_masks": instance_masks,
            "detection_boxes": bbox_list,
        }

        return return_dict

    def postprocess_object_detection(self,
                                     model_output: List[np.ndarray]) -> Dict:
        # Using them, get the indices of the important outputs.
        id_name_dict = {
            name: num
            for num, name in enumerate(self.model_output_names)
        }
        original_bboxes = model_output[
            id_name_dict["detection_boxes"]].squeeze()
        # Convert squeezed_bboxes
        converted_bboxes = deepcopy(original_bboxes)
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

    def load(self):
        loaded_model = ort.InferenceSession(
            os.path.join(self._directory_, "model.onnx"))
        self.model_inputs = loaded_model.get_inputs()
        self.model_input_names = list(map(lambda x: x.name, self.model_inputs))
        self.model_outputs = loaded_model.get_outputs()
        self.model_output_names = list(
            map(lambda x: x.name, self.model_outputs))
        model_h_w = self.model_inputs[0].shape
        self._height_ = model_h_w[2] if isinstance(model_h_w[2], int) else 640
        self._width_ = model_h_w[3] if isinstance(model_h_w[3], int) else 640
        self.model_type = loaded_model.get_modelmeta().description
        # run cold start
        random_image = np.random.random_integers(
            0, 255, (1, self._height_, self._width_, 3)).astype(np.uint8)
        self._model_ = loaded_model
        self._model_.run(self.model_output_names, {
            input_name: random_image
            for input_name in self.model_input_names
        })

    def predict(self, image_array):
        height, width, _ = image_array.shape
        if self._model_ is None:
            raise PortalError(Errors.NOTFOUND, "Model is not Loaded")
        try:
            detections = self._model_.run(
                self.model_output_names, {
                    input_name: np.expand_dims(image_array, 0)
                    for input_name in self.model_input_names
                })
            if self.model_type == "object detection":
                prediction_dict = self.postprocess_object_detection(detections)
                return prediction_dict
            if self.model_type == "deeplabv3":
                prediction_dict = self.postprocess_deeplabv3(detections)
                return prediction_dict
            if self.model_type == "yolox":
                prediction_dict = self.postprocess_yolox(detections)
                return prediction_dict
            if self.model_type == "yolov4":
                prediction_dict = self.postprocess_yolov4(detections)
                return prediction_dict

        except Exception as e:
            raise PortalError(Errors.FAILEDPREDICTION, str(e)) from e
