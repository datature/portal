"""Module containing the loading functions"""
import os

import tensorflow as tf
from flask import Response

# pylint: disable=E0401, E0611
from server import global_store
from server.utilities.label_map_loader import load_label_map
from server.services.errors import Errors, PortalError


def load_local(model_id: str) -> Response:
    """Load the model that is locally stored.

    :param model_id: The model key.
    :returns: Response of status 200 if successful.

    Potential Errors:
        INVALIDMODELKEY:    Model key is not found in registered model list.
        UNINITIALIZED:      No models are registered.
        INVALIDFILEPATH:    saved_model.pbtxt or saved_model.pb not found
                            in directory/saved_model.
    """
    if model_id in list(global_store.get_loaded_model_keys()):
        return Response(status=200)
    try:
        registered_model = global_store.get_registered_model(model_id)
        directory = registered_model["directory"]
        height = registered_model["height"]
        width = registered_model["width"]

        label_map = load_label_map(directory)

        model_dict = {
            "tf_model": tf.saved_model.load(os.path.join(directory, "saved_model")),
            "label_map": label_map,
            "model_height": height,
            "model_width": width,
        }

        global_store.load_model(model_id, model_dict)
        return Response(status=200)

    except KeyError as e:
        raise PortalError(
            Errors.INVALIDMODELKEY,
            model_id + " is not found in registered model list.",
        ) from e
    except TypeError as e:
        raise PortalError(Errors.UNINITIALIZED, "No models are registered.") from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILEPATH, str(e)) from e
