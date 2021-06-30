"""Module containing the prediction function"""
import os
import cv2

# pylint: disable=E0401, E0611
from server.utilities.prediction_utilities import (
    get_suppressed_output,
    back_to_tensor,
    get_detection_json,
    visualize,
    save_to_bytes,
)
from server.models._BaseModel import Model


# pylint: disable=R0913
def _predict_single_image(
    model_dict,
    format_arg,
    iou,
    image_array,
    confidence=0.001,
):
    """Make predictions on a single image.

    :param model: The loaded model.
    :param model_type: The type of the model.
    :param model_height: The height of the images that the model accepts.
    :param model_width: The width of the images that the model accepts.
    :param label_map: The label maps showing the labels accepted by the model.
    :param format_arg: The output format.
    :param iou: The intersection of union threshold.
    :param image_array: The single image as an array.
    :param confidence: The confidence threshold.
    :return: The predictions in the format requested by format_arg.
    """
    model = model_dict["model"]
    model_class: Model = model_dict["model_class"]
    label_map = model_class.get_label_map()
    image_array = cv2.cvtColor(image_array, cv2.COLOR_BGRA2RGB)
    detections = model_class.predict(
        model=model,
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
    model_dict,
    format_arg,
    iou,
    image_directory,
):
    """Make predictions on a single image.

    :param model: The loaded model.
    :param model_height: The height of the images that the model accepts.
    :param model_width: The width of the images that the model accepts.
    :param label_map: The label maps showing the labels accepted by the model.
    :param format_arg: The output format.
    :param iou: The intersection of union threshold.
    :param image_directory: The directory of the single image.
    :return: The predictions in the format requested by format_arg.
    """
    image_arr = cv2.imread(image_directory)
    return _predict_single_image(
        model_dict=model_dict,
        format_arg=format_arg,
        iou=iou,
        image_array=image_arr,
    )


# pylint: disable=R0913
def predict_video(
    model_dict,
    iou,
    video_directory,
    frame_interval,
    confidence,
):
    """Make predictions on a multiple images within the video.

    :param model: The loaded model.
    :param model_height: The height of the images that the model accepts.
    :param model_width: The width of the images that the model accepts.
    :param label_map: The label maps showing the labels accepted by the model.
    :param iou: The intersection of union threshold.
    :param video_directory: The directory of the video.
    :param frame_interval: The sampling interval of the video.
    :param confidence: The confidence threshold.
    :return: The predictions in the format requested by format_arg.
    """
    cap = cv2.VideoCapture(os.path.join(video_directory))
    fps = cap.get(cv2.cv2.CAP_PROP_FPS)
    image_list = []
    count = 0
    while cap.isOpened():
        # Capture frame-by-frame
        ret, frame = cap.read()
        if ret:
            cap.set(1, count)
            # Saves image of the current frame into jpg file
            image_list.append(frame)
            count += frame_interval

        else:
            cap.release()
            break
    cv2.destroyAllWindows()
    output_dict = {"fps": fps, "frames": {}}
    for index, image in enumerate(image_list):
        single_output = _predict_single_image(
            model_dict=model_dict,
            format_arg="json",
            iou=iou,
            image_array=image,
            confidence=confidence,
        )
        output_dict["frames"][
            int((index * frame_interval) / fps * 1000)
        ] = single_output

    return output_dict
