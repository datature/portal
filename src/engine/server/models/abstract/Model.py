#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   Model.py
@Author  :   Marcus Neo
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the factory function <model>
"""

from server.models.autodetect_model import AutoDetectModel
from server.models.darknet_model import DarknetModel
from server.models.endpoint_model import EndpointModel
from server.models.tensorflow_model import TensorflowModel


def Model(model_type: str, directory: str, name: str, description: str, **kwargs):
    """Factory function that routes the model to the specific class."""

    args = [model_type, directory, name, description]

    model_class = {
        "tensorflow": TensorflowModel,
        "darknet": DarknetModel,
        "endpoint": EndpointModel,
        "autodetect": AutoDetectModel,
    }

    return model_class[model_type](*args, **kwargs)
