"""Module containing the utilities needed for predictions."""
from base64 import encodebytes
from typing import Union

import tensorflow as tf
import numpy as np
import cv2
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

# pylint: disable=E0401, E0611
from server.utilities.color_switch import color_switch
from server import EPSILON_MULTIPLIER
from server.services.global_store import PortalError, Errors


def corrected_predict_query(*args, request) -> dict:
    """Check if the query are correctly input.

    (Function to be used by the predict routes)
    :param *args: Specific queries to check.
    :param model_key: The model key.
    :return: Tuple of the corrected predict query.
    """
    corrected_dict = {}
    # Format check
    if "format" not in args:
        format_arg = None

    else:
        format_arg = request.args.get("format")
        if format_arg not in ("json", "image"):
            raise PortalError(
                Errors.INVALIDQUERY,
                "Output format is not 'json' or 'image'.",
            )
    # Iou check
    if "iou" not in args:
        iou = None

    else:
        iou_string = request.args.get("iou", "0.8")
        try:
            iou = float(iou_string)
            if iou < 0 or iou > 1:
                raise ValueError
        except ValueError as e:
            raise PortalError(
                Errors.INVALIDQUERY,
                "IOU query not a float between 0.0 and 0.1.",
            ) from e

    # Confidence check
    if "confidence" not in args:
        confidence = 0.001
    else:
        try:
            confidence = float(request.args.get("confidence", 0.001))
        except TypeError as e:
            raise PortalError(
                Errors.INVALIDQUERY, "Confidence Query is not a float."
            ) from e

    reanalyse_string = request.args.get("reanalyse", "false")
    if reanalyse_string not in ["true", "false"]:
        raise PortalError(
            Errors.INVALIDQUERY,
            "Reanalyse Query is not one of 'true' or 'false'.",
        )

    reanalyse = reanalyse_string == "true"

    corrected_dict["format"] = format_arg
    corrected_dict["iou"] = iou
    corrected_dict["confidence"] = confidence
    corrected_dict["reanalyse"] = reanalyse
    return corrected_dict


def _filter_class_and_zero_scores(
    scores: np.array,
    classes: np.array,
    filter_class: Union[int, None],
    confidence: float = 0.001,
) -> list:
    """Create a list of indices representing the filtered elements.
    :param scores: Numpy array containing scores of all detections.
    :param classes: Numpy array containing classes of all detections.
    :filter_class: The class to be kept. All others will be filtered out.
    :confidence: The confidence threshold to be kept, filtering out the rest.
    :returns: List of indices of the filtered elements.
    """
    if filter_class is not None:
        filter_idx = [
            idx
            for idx, (score, class_id) in enumerate(zip(scores, classes))
            if (score >= confidence and class_id == filter_class)
        ]
    else:
        filter_idx = [
            idx for idx, score in enumerate(scores) if score >= confidence
        ]

    return filter_idx


def _non_max_suppress_bbox(
    bbox: np.array,
    scores: np.array,
    classes: np.array,
    filter_class: Union[int, None],
    iou: float = 0.8,
    confidence: float = 0.001,
) -> tuple:
    """Perform non max suppression on the detection output if it is bbox.
    :param bbox: Bbox outputs.
    :param scores: Score outputs.
    :param classes: Class outputs.
    :param filter_class: The specific class required.
    :param iou: The intersection of union value to be considered.
    :param confidence: The confidence threshold for scores.
    :returns: tuple of suppressed bbox, suppressed scores and suppressed classes.
    """
    filter_idx = _filter_class_and_zero_scores(
        scores,
        classes,
        filter_class,
        confidence,
    )
    scores_filter = np.array(np.array(scores)[filter_idx])
    bbox_filter = np.array(np.array(bbox)[filter_idx])
    classes_filter = np.array(np.array(classes)[filter_idx])
    x_1 = np.expand_dims(bbox_filter[:, 1], axis=1)
    y_1 = np.expand_dims(bbox_filter[:, 0], axis=1)
    x_2 = np.expand_dims(bbox_filter[:, 3], axis=1)
    y_2 = np.expand_dims(bbox_filter[:, 2], axis=1)
    # element-wise multiplication to get areas
    areas = (x_2 - x_1) * (y_2 - y_1)
    sorted_scores = scores_filter.argsort()[::-1]
    keep = []
    while sorted_scores.size > 0:
        score = sorted_scores[0]
        # keep the largest sorted score (sorted_scores[0] represent the largest score)
        keep.append(score)

        # compare the intersection with all other scores
        xx1 = np.maximum(x_1[score], x_1[sorted_scores[1:]])
        yy1 = np.maximum(y_1[score], y_1[sorted_scores[1:]])
        xx2 = np.minimum(x_2[score], x_2[sorted_scores[1:]])
        yy2 = np.minimum(y_2[score], y_2[sorted_scores[1:]])

        class_largest = classes_filter[score]
        class_others = classes_filter[sorted_scores[1:]]
        # intersect = width * height
        intersect = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)

        overlap = intersect / (
            areas[score] + areas[sorted_scores[1:]] - intersect
        )
        sorted_scores = sorted_scores[
            np.union1d(
                np.where(overlap <= 1 - iou)[0],
                np.where(class_others != class_largest),
            )
            + 1
        ]
    detection_boxes = list(map(tuple, bbox_filter[keep]))
    detection_scores = list(scores_filter[keep])
    detection_classes = list(classes_filter[keep])

    detection_boxes = [
        (float(item[0]), float(item[1]), float(item[2]), float(item[3]))
        for item in detection_boxes
    ]
    detection_scores = [float(item) for item in detection_scores]
    detection_classes = [int(item) for item in detection_classes]
    return (
        detection_boxes,
        detection_scores,
        detection_classes,
        None,
    )


def _non_max_suppress_mask(
    bbox: np.array,
    scores: np.array,
    classes: np.array,
    masks: Union[np.array, None],
    filter_class: int,
    iou: float = 0.8,
    confidence: float = 0.001,
) -> tuple:
    """Perform non max suppression on the detection output if it is mask.
    :param bbox: Bbox outputs.
    :param scores: Score outputs.
    :param classes: Class outputs.
    :param masks: Mask outputs
    :param filter_class: The specific class required.
    :param iou: The intersection of union value to be considered.
    :param confidence: The confidence threshold for scores.
    :returns: tuple of suppressed bbox, suppressed scores,
        suppressed classes, and suppressed masks.
    """
    filter_idx = _filter_class_and_zero_scores(
        scores,
        classes,
        filter_class,
        confidence,
    )
    scores_filter = np.array(np.array(scores)[filter_idx])
    bbox_filter = np.array(np.array(bbox)[filter_idx])
    classes_filter = np.array(np.array(classes)[filter_idx])
    masks_filter = np.array(np.array(masks)[filter_idx])

    areas = np.empty(masks_filter.shape[0])
    for index, mask in enumerate(masks_filter):
        areas[index] = np.count_nonzero(mask)
    sorted_scores = scores_filter.argsort()[::-1]
    keep = []
    while sorted_scores.size > 0:
        score = sorted_scores[0]
        # keep the largest sorted score (sorted_scores[0] represent the largest score)
        keep.append(score)

        # with:
        # x = [0 0 1 1] and y = [0 1 1 0],
        # the intersect is x && y element-wise -> [0 0 1 0]
        intersect = np.empty_like(sorted_scores[1:])
        for index, others in enumerate(masks_filter[sorted_scores[1:]]):
            intersect[index] = np.count_nonzero(
                np.logical_and(masks_filter[score], others)
            )

        overlap = intersect / (
            areas[score] + areas[sorted_scores[1:]] - intersect
        )
        sorted_scores = sorted_scores[
            np.union1d(
                np.where(overlap <= 1 - iou)[0],
                np.where(
                    classes_filter[sorted_scores[1:]] != classes_filter[score]
                ),
            )
            + 1
        ]
    detection_boxes = list(map(tuple, bbox_filter[keep]))
    detection_scores = list(scores_filter[keep])
    detection_classes = list(classes_filter[keep])
    detection_masks = list(masks_filter[keep])
    detection_boxes = [
        (float(item[0]), float(item[1]), float(item[2]), float(item[3]))
        for item in detection_boxes
    ]
    detection_scores = [float(item) for item in detection_scores]
    detection_classes = [int(item) for item in detection_classes]
    return (
        detection_boxes,
        detection_scores,
        detection_classes,
        detection_masks,
    )


def _apply_mask(image, mask, colors, alpha=0.5):
    """Apply the given mask to the image.
    Args:
      image: original image array.
      mask: predict mask array of image.
      colors: color to apply for mask.
      alpha: transparency of mask.
    Returns:
      array of image with mask overlay
    """
    for color in range(3):
        image[:, :, color] = np.where(
            mask == 1,
            image[:, :, color] * (1 - alpha) + alpha * colors[color],
            image[:, :, color],
        )
    return image


def get_suppressed_output(
    detections,
    image_array: np.array,
    filter_id: int,
    iou: float,
    confidence: float,
) -> tuple:
    """Filters detections based on the intersection of union theory.
    :param detections: The tensorflow prediction output.
    :param image_array: The image in the form of a numpy array.
    :param filter_id: The specific class to be filtered.
    :param iou: The intersection of union threshold.
    :param confidence: The confidence threshold.
    :returns: tuple of suppressed bbox, suppressed scores and suppressed classes.
    """
    detection_masks = (
        detections["detection_masks"]
        if "detection_masks" in detections
        else None
    )
    detection_boxes = detections["detection_boxes"]
    detection_scores = detections["detection_scores"]
    detection_classes = detections["detection_classes"]
    return (
        _non_max_suppress_bbox(
            bbox=detection_boxes,
            scores=detection_scores,
            classes=detection_classes,
            filter_class=filter_id,
            iou=iou,
            confidence=confidence,
        )
        if detection_masks is None
        else _non_max_suppress_mask(
            img_arr=image_array,
            bbox=detection_boxes,
            scores=detection_scores,
            classes=detection_classes,
            masks=detection_masks,
            filter_class=filter_id,
            iou=iou,
            confidence=confidence,
        )
    )


def back_to_tensor(suppressed_output: tuple) -> dict:
    """Convert a list of lists back into a tensor.
    :param suppressed_output:
        Tuple of suppressed bbox, suppressed scores and suppressed classes.
    :returns: Dictionary containing the suppressed outputs in tensor form.
    """
    tensor_dict = {
        "num_detections": tf.convert_to_tensor(
            np.array(
                [
                    float(len(tf.convert_to_tensor(suppressed_output[2]))),
                ],
                dtype=np.float32,
            ),
            dtype=tf.float32,
        ),
        "detection_boxes": tf.convert_to_tensor(
            np.array([suppressed_output[0]], dtype=np.float32),
            dtype=tf.float32,
        ),
        "detection_scores": tf.convert_to_tensor(
            np.array([suppressed_output[1]], dtype=np.float32),
            dtype=tf.float32,
        ),
        "detection_classes": tf.convert_to_tensor(
            np.array([suppressed_output[2]], dtype=np.float32),
            dtype=tf.float32,
        ),
    }
    if suppressed_output[3] is not None:
        tensor_dict["detection_masks"] = tf.convert_to_tensor(
            np.array([suppressed_output[3]], dtype=np.uint8),
            dtype=tf.uint8,
        )
    return tensor_dict


def _convert_mask_to_contours(reframed_masks: np.array) -> list:
    """Convert mask detections into contours.
    :param reframed_masks: Numpy array representing the instance mask.
    :returns: The list of contours.
    """
    _, height, width = reframed_masks.shape
    contours = []
    for single_mask in reframed_masks:
        # 1. Get the contours using cv2.find contours.
        # The contours may be fragmented,
        # thereby the result may be a list of contours.
        found_contours = cv2.findContours(
            single_mask,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_NONE,
        )
        # Output of cv2.findContours has tuple of single list format ([xxx]).
        # The outer tuple and list are of the same dimensions
        # We only need the list, so we take
        # the inner (single) 0th element of the tuple.
        inner_contour = found_contours[0]

        # If theres no contours at all we just skip and append an empty list.
        if not bool(inner_contour):
            contours.append([])
        else:
            polygons = []
            for single_contour in inner_contour:
                # 2. Simplfy the contour to get an approximation
                epsilon = EPSILON_MULTIPLIER * cv2.arcLength(
                    single_contour, True
                )
                approx = cv2.approxPolyDP(single_contour, epsilon, True)
                # 3. Normalize the approximation
                approx = [
                    [item[0][0] / width, item[0][1] / height]
                    for item in approx
                ]

                # Min 3 points is needed for polygon to be created
                if len(approx) >= 3:
                    polygon = Polygon(approx)
                    polygons.append(polygon)

            # For the case where approx contour has less than 3 points and
            # is filtered out, we also just skip and append an empty list.
            if not bool(polygons):
                contours.append([])
            else:
                # 4. With all Polygons, create a Multipolygon Object
                multipolygon = MultiPolygon(polygons)
                # 5. Union all Polygons in Multipolygon Object
                union_polygon = unary_union(multipolygon)
                # Output of union may be either
                # Polygon (All Polygons touching each other previously)
                # or MultiPolygon (Previously some separated Polygons)

                # 5. For MultiPolygon, get Polygon with the largest area
                if isinstance(union_polygon, MultiPolygon):
                    # pylint: disable=E1101
                    polygon_list = list(union_polygon.geoms)
                    largest_poly_idx = np.argmax(
                        [item.area for item in polygon_list]
                    )
                    final_polygon = polygon_list[largest_poly_idx]

                # 6. No change for single polygon
                else:
                    final_polygon = union_polygon

                # 7. Extract the contour points and append
                contours.append(list(final_polygon.exterior.coords))
    return contours


def get_detection_json(detections_output: dict, category_map: tuple) -> list:
    """Obtain the json detections given the detection tuple.
    :param detections: Tuple containing bboxes, scores, classes
    :param category_map: Category map of classes.
    :returns: Json format to be of the bboxes, scores and classes.
    """
    num_detections = int(detections_output.pop("num_detections"))
    detections = {
        key: value[0, :num_detections].numpy()
        for key, value in detections_output.items()
    }
    # Extract predictions
    bboxes = detections["detection_boxes"]
    classes = detections["detection_classes"].astype(np.int64)
    scores = detections["detection_scores"]
    if not "detection_masks" in detections:
        contours = None
    else:
        reframed_masks = detections["detection_masks"]
        contours = _convert_mask_to_contours(reframed_masks)

    output = []

    for each_class, _ in enumerate(classes):
        if contours is None or (
            contours is not None and bool(contours[each_class])
        ):
            class_name = category_map[str(classes[each_class])]
            item = {}
            item["confidence"] = float(scores[each_class])
            item["tag"] = class_name
            item["bound"] = [
                [float(bboxes[each_class][1]), float(bboxes[each_class][0])],
                [float(bboxes[each_class][1]), float(bboxes[each_class][2])],
                [float(bboxes[each_class][3]), float(bboxes[each_class][2])],
                [float(bboxes[each_class][3]), float(bboxes[each_class][0])],
            ]
            if contours is not None:
                item["boundType"] = "masks"
                item["contourType"] = "polygon"
                item["contour"] = contours[each_class]
            else:
                item["boundType"] = "rectangle"

            output.append(item)
    return output


def visualize(
    img_arr: np.array,
    detections_output: dict,
    category_index: dict,
) -> np.array:
    """Visualize the bounding boxs and/or masks onto the image.
    :param img_arr: The image in the form of a numpy array.
    :param detections_output: The predictions generated by the tf model.
    :param category_index: The label map.
    :returns: The imaged with visualized bboxes and/or masks as a numpy array.
    """
    height, width, _ = img_arr.shape
    num_detections = int(detections_output.pop("num_detections"))
    detections = {
        key: value[0, :num_detections].numpy()
        for key, value in detections_output.items()
    }
    detections["num_detections"] = num_detections
    # Extract predictions
    bboxes = detections["detection_boxes"]
    classes = detections["detection_classes"].astype(np.int64)
    scores = detections["detection_scores"]
    if "detection_masks" in detections:
        masks = detections["detection_masks"]
    else:
        masks = None
    # Draw Predictions
    for idx, each_bbox in enumerate(bboxes):
        color = color_switch(classes[idx] - 1)
        if masks is not None and len(masks) != 0:
            img_arr = _apply_mask(img_arr, masks[idx], color)

        # Draw bounding box
        cv2.rectangle(
            img_arr,
            (int(each_bbox[1] * width), int(each_bbox[0] * height)),
            (
                int(each_bbox[3] * width),
                int(each_bbox[2] * height),
            ),
            color,
            2,
        )

        # Draw label background
        cv2.rectangle(
            img_arr,
            (
                int(each_bbox[1] * width),
                int(each_bbox[2] * height),
            ),
            (
                int(each_bbox[3] * width),
                int(each_bbox[2] * height + 15),
            ),
            color,
            -1,
        )
        ## Insert label class & score
        cv2.putText(
            img_arr,
            "Class: {}, Score: {}".format(
                str(category_index[str(classes[idx])]["name"]),
                str(round(scores[idx], 2)),
            ),
            (
                int(each_bbox[1] * width),
                int(each_bbox[2] * height + 10),
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.3,
            (0, 0, 0),
            1,
            cv2.LINE_AA,
        )
    return img_arr


def save_to_bytes(img_array: np.array) -> dict:
    """Convert an image array to a byte array.
    :param img_array: The image in the form of a numpy array.
    :returns: The byte array.
    """
    # convert the array back to bgr for exporting
    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    _, bts = cv2.imencode(".jpg", img_array)
    output = {"predicted_image": encodebytes(bts.tostring()).decode("ascii")}
    return output
