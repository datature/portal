#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   model_register.py
@Author  :   Marcus Neo
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing the register functions.
"""
import os

from datature.nexus import Client

# pylint: disable=E0401, E0611
from server import global_store
from server.models.abstract.Model import Model
from server.services.errors import Errors, PortalError


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
            saved_model/{saved_model.pb|saved_model.pbtxt}
            is not found in given directory.
    """
    reg_model = Model(model_type, directory, name, description)
    global_store.add_registered_model(*reg_model.register(), store_cache=True)


def register_hub(
    model_key: str,
    project_key: str,
    project_secret: str,
    name: str,
    description: str,
) -> None:
    """Register a model from hub.

    :param model_key: The model key obtained from Nexus.
    :param project_key: The project key obtained from Nexus.
    :param project_secret: The project secret obtained from Nexus.
    """
    try:
        client = Client(secret_key=project_secret)
        project = client.get_project(f"proj_{project_key}")

        model_id = f"model_{model_key}"
        artifact_list = [artifact["id"] for artifact in project.artifacts.list()]
        found = False
        for artifact_id in artifact_list:
            model_list = {
                model["id"]: model["download"]["url"]
                for model in project.artifacts.list_exported_models(artifact_id)
            }
            if model_id in model_list:
                found = True
                break
        if not found:
            raise ValueError(f"Model key {model_key} not found.")

        model_dir = os.path.join("server", "hub_models")
        if os.path.isdir(model_dir):
            main_path = os.path.join("server", "hub_models", model_id)
        elif os.path.isdir("resources"):
            main_path = os.path.join("resources", "server", "hub_models", model_id)
        else:
            main_path = os.path.join("portal_build", "server", "hub_models", model_id)

        project.artifacts.download_exported_model(model_id, main_path)
        reg_model = Model(
            "autodetect",
            main_path,
            name,
            description,
        )
        global_store.add_registered_model(*reg_model.register(), store_cache=True)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except (FileNotFoundError, ModuleNotFoundError) as e:
        raise PortalError(Errors.NOTFOUND, str(e)) from e
    except (RuntimeError, ValueError) as e:
        raise PortalError(Errors.HUBERROR, str(e)) from e


def register_endpoint(
    link: str, project_secret: str, name: str, description: str
) -> None:
    """Register a model from an endpoint.

    :param link: The URL of the endpoint.
    :param project_secret: The proejct secret to access the endpoint.
    """
    reg_model = Model(
        "endpoint",
        "",
        name,
        description,
        link=link,
        project_secret=project_secret,
    )
    global_store.add_registered_model(*reg_model.register(), store_cache=False)
