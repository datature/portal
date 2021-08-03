"""Module containing the prediction function"""
import os
import cv2
from typing import Optional

import numpy as np

# pylint: disable=E0401, E0611
from server.utilities.prediction_utilities import (
    get_suppressed_output,
    back_to_tensor,
    get_detection_json,
    visualize,
    save_to_bytes,
)
from server.models.abstract.BaseModel import BaseModel

from server.services.errors import PortalError, Errors
from server import global_store

# pylint: disable=R0913
def _predict_single_image(
    model_class: BaseModel,
    format_arg: str,
    iou: float,
    image_array: np.ndarray,
    confidence: Optional[float] = 0.001,
):
    """Make predictions on a single image.

    :param model_class: A dictionary of the loaded model and its model class.
    :param format_arg: The output format.
    :param iou: The intersection of union threshold.
    :param image_array: The single image as an array.
    :param confidence: The confidence threshold.
    :return: The predictions in the format requested by format_arg.
    """
    label_map = model_class.get_label_map()
    image_array = cv2.cvtColor(image_array, cv2.COLOR_BGRA2RGB)
    detections = model_class.predict(
        image_array=image_array,
    )
    suppressed_output = get_suppressed_output(
        detections=detections,
        image_array=image_array,
        filter_id=None,
        iou=iou,
        confidence=confidence,
    )
    if format_arg == "json":
        output = get_detection_json(
            back_to_tensor(suppressed_output),
            label_map,
        )
    elif format_arg == "image":
        visualized_image = visualize(
            img_arr=image_array,
            detections_output=back_to_tensor(suppressed_output),
            category_index=label_map,
        )
        output = save_to_bytes(visualized_image)
    return output


def predict_image(
    model_class: BaseModel,
    format_arg: str,
    iou: float,
    image_directory: str,
):
    """Make predictions on a single image.

    :param model_class: A dictionary of the loaded model and its model class.
    :param format_arg: The output format.
    :param iou: The intersection of union threshold.
    :param image_directory: The directory of the single image.
    :return: The predictions in the format requested by format_arg.
    """
    image_arr = cv2.imread(image_directory)
    return _predict_single_image(
        model_class=model_class,
        format_arg=format_arg,
        iou=iou,
        image_array=image_arr,
    )


# pylint: disable=R0913
def predict_video(
    model_class: BaseModel,
    iou: float,
    video_directory: str,
    frame_interval: int,
    confidence: float,
):
    """Make predictions on a multiple images within the video.

    :param model_class: A dictionary of the loaded model and its model class.
    :param iou: The intersection of union threshold.
    :param video_directory: The directory of the video.
    :param frame_interval: The sampling interval of the video.
    :param confidence: The confidence threshold.
    :return: The predictions in the format requested by format_arg.
    """
    cap = cv2.VideoCapture(os.path.join(video_directory))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    global_store.set_prediction_progress("video", 0, total_frames)
    output_dict = {"fps": fps, "frames": {}}
    count = 0
    while cap.isOpened():
        # check between each iteration if the process-stop flag is set.
        # kills the video prediction if it has been set.
        if global_store.get_stop():
            cap.release()
            cv2.destroyAllWindows()
            global_store.clear_stop()
            raise PortalError(
                Errors.STOPPEDPROCESS, "video prediction killed."
            )
        # Capture frame-by-frame
        ret, frame = cap.read()
        if ret:
            cap.set(1, count)
            # make inference the frame
            single_output = _predict_single_image(
                model_class=model_class,
                format_arg="json",
                iou=iou,
                image_array=frame,
                confidence=confidence,
            )
            # add the inferences into the dictionary
            output_dict["frames"][int(count / fps * 1000)] = single_output
            # move on to the next frame
            count += frame_interval
            global_store.set_prediction_progress("video", count, total_frames)
        else:
            cap.release()
            break
    global_store.set_prediction_progress("none", 1, 1)
    cv2.destroyAllWindows()
    return output_dict
