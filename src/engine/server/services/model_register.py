"""Module containing the register functions."""
import os

from datature_hub.hub import HubModel
from datature_hub.utils.get_height_width import dims_from_config

# pylint: disable=E0401, E0611
from server import global_store
from server.services.errors import Errors, PortalError
from server.models.abstract.Model import Model


def register_local(
    directory: str,
    model_type: str,
    name: str,
    description: str,
) -> None:
    """Register a locally stored model.

    :param directory: The model directory.
    :param height: The model height.
    :param width: The model width.

    Possible Errors:
        INVALIDFILEPATH:
            saved_model/{saved_model.pb|saved_model.pbtxt} is not found in given directory.
    """
    reg_model = Model(model_type, directory, name, description)
    global_store.add_registered_model(*reg_model.register())


def register_hub(
    model_key: str,
    project_secret: str,
    hub_dir: str,
    name: str,
    description: str,
) -> None:
    """Register a model from hub.

    :param model_key: The model key obtained from Nexus.
    :param project_secret: The project secret obtained from Nexus.
    """
    try:
        hub_model = HubModel(
            project_secret=project_secret,
            model_key=model_key,
            hub_dir=hub_dir if hub_dir != "" else os.getenv("MODEL_DIR"),
        )
        model_folder = hub_model.model_dir
        if not os.path.exists(model_folder):
            model_folder = hub_model.download_model()
        pipeline_config_directory = hub_model.get_pipeline_config_dir()
        height, width = dims_from_config(pipeline_config_directory)
        reg_model = Model(
            "tensorflow",
            model_folder,
            name,
            description,
            height=height,
            width=width,
        )
        global_store.add_registered_model(*reg_model.register())

    # Except Block
    # Catches all possible native exceptions here and translates them into PortalError.
    except (FileNotFoundError, ModuleNotFoundError) as e:
        raise PortalError(Errors.NOTFOUND, str(e)) from e
    except (RuntimeError, ValueError) as e:
        raise PortalError(Errors.HUBERROR, str(e)) from e


def register_endpoint(
    model_key: str, project_secret: str, name: str, description: str
) -> None:
    """Register a model from an endpoint.

    :param model_key: The model key obtained from the endpoint.
    :param project_secret: The proejct secret obtained from the endpoint.
    """
    reg_model = Model(
        "endpoint",
        "",
        name,
        description,
        model_key=model_key,
        project_secret=project_secret,
    )
    global_store.add_registered_model(*reg_model.register())
    # raise NotImplementedError("model_loading_services - load_endpoint")
