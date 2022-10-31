from typing import List, Dict

import numpy as np
import torch
import torchvision

from server.utilities.onnx_models.abstract import AbstractProcessor


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


class Processor(AbstractProcessor):

    @property
    def processor_type(self):
        return "yolox"

    def preprocess(self, model_input: np.ndarray) -> np.ndarray:
        model_input = model_input.astype(np.float32).transpose([2, 0, 1])
        return model_input

    def postprocess(self, model_output: List[np.ndarray], **kwargs) -> Dict:
        category_map = kwargs["category_map"]
        height = kwargs["height"]
        width = kwargs["width"]
        model_output = model_output[0]
        post_out = _postprocess(model_output, num_classes=len(category_map))
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
            float(bbox[0] / height),
            float(bbox[1] / width),
            float(bbox[2] / height),
            float(bbox[3] / width),
        ] for bbox in bboxes]
        bboxes = np.array(bboxes)
        bboxes[:, [0, 1, 2, 3]] = bboxes[:, [1, 0, 3, 2]]
        bboxes = bboxes.tolist()
        classes = [int(clss) for clss in classes]
        scores = [float(score) for score in scores]
        return_dict = {
            "detection_boxes": bboxes,
            "detection_classes": classes,
            "detection_scores": scores,
        }
        return return_dict
