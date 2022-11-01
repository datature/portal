# pylint: disable=E0401, E0611
from typing import List, Dict

import cv2
import numpy as np
from torchvision import transforms

from server.utilities.onnx_models.abstract import AbstractProcessor


class Processor(AbstractProcessor):

    def get_polygons(self, mask: np.ndarray):
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
                            contour = tuple(
                                (cnt[0][1] / width, cnt[0][0] / height)
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

    def preprocess(self, model_input: np.ndarray) -> np.ndarray:
        model_input = model_input.astype(np.uint8)
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            )
        ])
        model_input = transform(model_input).numpy()
        return model_input

    def postprocess(self, model_output: List[np.ndarray], **kwargs) -> Dict:
        del kwargs
        class_masks = model_output[0][0]
        instance_masks, bbox_list, class_ids, scores = self.get_polygons(
            class_masks)
        bbox_list = np.array(bbox_list)
        bbox_list[:, [0, 1, 2, 3]] = bbox_list[:, [1, 0, 3, 2]]
        bbox_list = bbox_list.tolist()
        return_dict = {
            "detection_classes": class_ids,
            "detection_scores": scores,
            "detection_masks": instance_masks,
            "detection_boxes": bbox_list,
        }

        return return_dict
