import numpy as np


def yolov8_predict(model, image_array, input_size):
    """Prediction function for YOLOv8.

    Args:
        model: YOLOV8 model.
        image_array: Image ndarray to predict on.
        input_size: A tuple of (height, width) specifying the
                    input size of the model.

    Returns:
        A dictionary of detections containing bounding boxes, classes,
        scores and masks (if task is segmentation else None).
    """
    detections = {}
    detections_output = model.predict(image_array,
                                      imgsz=input_size,
                                      conf=0.0,
                                      verbose=False)
    detections_output = detections_output[0]
    boxes = detections_output.boxes.xyxyn.numpy()
    boxes = boxes[:, [1, 0, 3, 2]]
    classes = detections_output.boxes.cls.numpy()
    scores = detections_output.boxes.conf.numpy()
    masks = detections_output.masks.data.numpy(
    ) if detections_output.masks is not None else None

    detections["detection_boxes"] = boxes
    detections["detection_classes"] = classes
    detections["detection_scores"] = scores
    detections["detection_masks"] = masks
    return detections


def onnx_predict(model, model_format, input_name, output_name, image_array):
    """Prediction function for ONNX models.

    Args:
        model: ONNX model.
        model_format: Model format of the model.
        input_name: Name of the input tensor.
        output_name: Name of the output tensor.
        image_array: Image ndarray to predict on.

    Returns:
        A tensor of output detections.
    """
    if model_format == "instance":
        detections_output = model.run(output_name, {input_name: image_array})
        _, scores, classes, bboxes, masks = detections_output
        detections_output = bboxes, masks, scores, classes
    else:
        detections_output = model.run([output_name], {input_name: image_array})
        detections_output = detections_output[0][0]
    return detections_output


def tflite_predict(model, model_format, image_array):
    """Prediction function for TFLite models.

    Args:
        model: TFLite model.
        model_format: Model format of the model.
        image_array: Image ndarray to predict on.

    Returns:
        A tensor of output detections.
    """
    detections_output = model(inputs=image_array)
    if model_format == "bounding box":
        _, scores, classes, boxes = list(detections_output.values())
        if len(boxes.shape) >= 3:
            boxes = np.squeeze(boxes, axis=0)
            scores = np.squeeze(scores, axis=0)
            classes = np.squeeze(classes, axis=0)
        detections_output = np.c_[boxes, scores, classes,
                                  np.ones_like(classes)]
    elif model_format == "instance":
        scores = np.array(detections_output["output_1"])
        classes = np.array(detections_output["output_2"]).astype(np.int16)
        bboxes = np.array(detections_output["output_3"])
        masks = np.array(detections_output["output_4"])
        detections_output = bboxes, masks, scores, classes
    elif model_format == "semantic":
        detections_output = detections_output["output"][0]
    else:
        raise ValueError(model_format)
    return detections_output


def torch_predict(model, image_array):
    """Prediction function for PyTorch models.

    Args:
        model: PyTorch model.
        image_array: Image ndarray to predict on.

    Returns:
        A tensor of output detections.
    """
    import torch
    detections_output = model(torch.Tensor(image_array))
    detections_output = detections_output[0].detach().numpy()
    return detections_output


def tf_predict(model, model_format, output_name, image_array):
    """Prediction function for TensorFlow models.

    Args:
        model: TensorFlow model.
        model_format: Model format of the model.
        output_name: Name of the output tensor.
        image_array: Image ndarray to predict on.

    Returns:
        A tensor of output detections.
    """
    detections_output = model(inputs=image_array)
    if model_format == "instance":
        bboxes = detections_output["output_3"].numpy()
        masks = detections_output["output_4"].numpy()
        scores = detections_output["output_1"].numpy()
        classes = detections_output["output_2"].numpy().astype(np.int16)
        detections_output = bboxes, masks, scores, classes
    else:
        detections_output = np.array(detections_output[output_name][0])
