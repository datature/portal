"""Module containing the GlobalStore class."""
import gc
import os
import atexit
import json
import time
from typing import Union
import jsonpickle

from flask import Response
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Ignore import-error and no-name-in-module due to Pyshell
# pylint: disable=E0401, E0611
from server.services.errors import Errors, PortalError

# pylint: disable=cyclic-import
from server.services.filesystem.folder_target import FolderTargets

from server.models.abstract.BaseModel import BaseModel
from server.models.abstract.Model import Model


def _delete_store_():
    if os.path.isfile(os.getenv("CACHE_DIR")):
        os.remove(os.getenv("CACHE_DIR"))


# pylint: disable=R0904
class GlobalStore:
    """Storage of global variables."""

    # MODEL INITIALIZER AND DESTRUCTOR
    def __init__(self, model_load_limit, idle_minutes, caching_system) -> None:
        """Initialize the GlobalStore class."""
        self._global_server_time_ = time.time()
        self._is_cache_called_ = False
        self._scheduler_ = None
        self._loaded_model_list_ = {}
        self._op_status_ = {"status": None}
        self._op_atomic_ = False
        self._image_list_cache_ = []
        self._targeted_folders_ = FolderTargets()
        self._image_unchanged_ = False
        self._bulk_info_ = {"image_name": None, "progress": 100.0}
        self._process_stop_ = False
        self._caught_response_ = {}
        self._model_load_limit_ = model_load_limit
        self._prediction_progress_ = {
            "status": "none",
            "progress": 1,
            "total": 1,
        }
        self._idle_minutes_ = idle_minutes

        # Flag to enable or diable the caching system
        self.caching_system = caching_system
        self._store_ = {
            "registry": {},
            "predictions": {},
            "targeted_folders": jsonpickle.encode(self._targeted_folders_),
        }

    def _is_shutdown_server_(self, timer):
        """Check if the server should be shut down.

        :param timer: The threshold time that would lead to a shut down
        :return: The decision to shut down.
        """
        now = time.time()
        elapsed_time = now - self._global_server_time_
        if elapsed_time >= timer:
            return False
        return True

    def _schedule_shutdown_(self):
        """Scheduler Job to check whether there's inactivity within the last 5 minutes

        :return: void
        """
        if self._is_shutdown_server_(self._idle_minutes_) or self._op_atomic_:
            time.sleep(5)
        else:
            os._exit(0)  # pylint: disable=W0212

    def set_start_scheduler(self):
        """Start the scheduler"""
        if self._scheduler_ is None:
            self._scheduler_ = BackgroundScheduler(daemon=True)
            self._scheduler_.add_job(
                self._schedule_shutdown_, IntervalTrigger(minutes=1)
            )
            self._scheduler_.start()

            # Shut down the scheduler when exiting the app
            # pylint: disable=unnecessary-lambda)
            atexit.register(lambda: self._scheduler_.shutdown())

    def set_still_alive(self):
        """Updates the global_server_time attribute"""
        now = time.time()
        self._global_server_time_ = max(self._global_server_time_, now)

    def set_is_cache_called(self, path):
        """Fist initialization in run.py

        :param path: dir of cache
        """
        self._is_cache_called_ = not os.path.isfile(path)

    def load_cache(self):
        """Load the cache.

        Transfers data from "./server/cache/store.portalCache" into self._store_
        """
        if os.path.isfile(os.getenv("CACHE_DIR")):
            with open(os.getenv("CACHE_DIR"), "r") as cache:
                self._store_ = json.load(cache)
                self._targeted_folders_ = jsonpickle.decode(
                    self._store_["targeted_folders"]
                )
                for _, value in self._store_["registry"].items():
                    reg_model = Model(
                        value["model_type"],
                        value["model_dir"],
                        value["model_name"],
                        "",
                        **value["model_kwargs"],
                    )
                    self.add_registered_model(*reg_model.register())
                self._is_cache_called_ = True
        else:
            raise PortalError(
                Errors.NOTFOUND,
                "cache file does not exist",
                "global_store.load_cache",
            )

    def _save_store_(self):
        """Save to cache.

        Transfers data from self._store_ into "./server/cache/store.portalCache"
        """
        if self.caching_system:
            cache_store = self._store_.copy()
            updated_registry = {
                registry_key: {
                    key: value
                    for key, value in self._store_["registry"][
                        registry_key
                    ].items()
                    if key
                    in [
                        "model_type",
                        "model_dir",
                        "model_name",
                        "model_kwargs",
                    ]
                }
                for registry_key in list(self._store_["registry"].keys())
            }
            cache_store["registry"] = updated_registry

            with open(os.getenv("CACHE_DIR"), "w+") as cache:
                json.dump(cache_store, cache)

    # pylint: disable=R0201
    def has_cache(self):
        """Check if there's cache

        :return: Boolean representing the output of the function.
        """
        return os.path.isfile(os.getenv("CACHE_DIR"))

    def is_cache_called(self):
        """Check existing cache has once been loaded

        :return: Boolean representing the output of the function.
        """
        return self._is_cache_called_

    def cache_is_called(self):
        """Sets cache is called"""
        self._is_cache_called_ = True

    # no real need for the in-bulit destructor. This function is called instead.
    def delete_cache(self) -> None:
        """Sync all persistent dicitionaries. To be done before entire system closes."""
        if self.caching_system:
            _delete_store_()

    # ATOMIC FUNCTION CHECKS
    def get_atomic(self) -> bool:
        """Getter for self._op_atomic_"""
        return self._op_atomic_

    def set_stop(self) -> None:
        """Set the process_stop flag (Currently only for videos)"""
        if self._op_atomic_:
            self._process_stop_ = True

    def clear_stop(self) -> None:
        """Clear the process_stop flag"""
        self._process_stop_ = False

    def get_stop(self) -> bool:
        """Get the value of the process_stop flag"""
        return self._process_stop_

    def set_status(self, status: str) -> bool:
        """Set the status when an atomic function is running.

        :param status: string representing the name of the atomic function.
        :return: boolean representing if the same function is already running.
        """
        if self._op_atomic_ is False:
            self._op_atomic_ = True
            self._op_status_["status"] = status
            return False
        if self._op_status_["status"] == status:
            return True
        raise PortalError(
            Errors.ATOMICERROR, "Another atomic process is already running."
        )

    def get_status(self) -> None:
        """Acquire the status of the atomic function."""
        return self._op_status_["status"]

    def clear_status(self) -> None:
        """Reset the status attribute."""
        self._op_status_["status"] = None
        self._op_atomic_ = False

    def set_caught_response(
        self, response_name: str, response: Union[Response, tuple]
    ) -> None:
        """Store the return of a function.

        :param response_name: The string signifying the origin of the response.
        :param response: The response contents.
        """
        self._caught_response_[response_name] = response

    def get_caught_response(self, origin: str) -> Union[Response, tuple]:
        """Retrieves the response corresponding to the origin.

        :param origin: The string signifying the origin of the response.
        :return: The response corresponding to the origin.
        """
        return self._caught_response_[origin]

    # MODEL (DE)REGISTRATION AND INFORMATION
    def get_registered_model_list(self) -> dict:
        """Retrieve the list of models."""
        return {
            key: dic["directory"]
            for key, dic in self._store_["registry"].items()
        }

    def add_registered_model(
        self,
        key: str,
        model: BaseModel,
    ) -> None:
        """Add or update a model into the registry.

        :param key: The model key.
        :param _model_: The _model_ class attributed to the model key.

        Cases:
        same dir    same name   =>  pop old from and add new to existing list
        same dir    diff name   =>  pop old from and add new to existing list
        diff dir    same name   =>  ERROR Name has been used
        diff dir    diff name   =>  add new to existing list
        """
        model_dir = model.get_info()["directory"]
        model_name = model.get_info()["name"]
        model_type = model.get_info()["type"]
        model_kwargs = model.get_info()["kwargs"]
        for item in self._store_["registry"]:
            if self._store_["registry"][item]["model_dir"] == model_dir:
                self._store_["registry"].pop(item)
                break
            if self._store_["registry"][item]["model_name"] == model_name:
                raise PortalError(
                    Errors.INVALIDAPI,
                    "A model with the same name already exists.",
                )
        model_class = model
        self._store_["registry"][key] = {
            "class": model_class,
            "model_type": model_type,
            "model_dir": model_dir,
            "model_name": model_name,
            "model_kwargs": model_kwargs,
        }
        self._save_store_()

    def get_registered_model(self, key: str) -> BaseModel:
        """Retrieve the model given its model key

        :param key: The model key.
        :return: The model as a Model class.
        """
        if key in self._store_["registry"]:
            return self._store_["registry"][key]["class"]
        raise PortalError(Errors.INVALIDMODELKEY, "Model not registered.")

    def get_registered_model_info(self) -> str:
        """Retrieve directory, description, name of all registered models"""
        return {
            model_id: model_dict["class"].get_info()
            for model_id, model_dict in self._store_["registry"].items()
        }

    def del_registered_model(self, key: str) -> None:
        """De-register a model given the model key.

        :param key: The model key.
        """
        self._store_["registry"].pop(key)
        gc.collect()
        self._save_store_()

    # MODEL (UN)LOADING AND MODEL INFORMATIONS
    def check_model_limit(self):
        """Check if current registered models exceeds the model limit."""
        return len(self._loaded_model_list_) >= self._model_load_limit_

    def load_model(self, key: str, model_class: BaseModel) -> None:
        """Add a model into the loaded model list.

        :param key: The model key.
        :param model_class: The model class that the model key represents.
        """
        self._loaded_model_list_[key] = model_class

    def get_loaded_model_keys(self) -> list:
        """Retrieve all model keys in the loaded model list."""
        return list(self._loaded_model_list_.keys())

    def unload_model(self, key: str) -> None:
        """Unload a model from the loaded model list given its model key.

        :param key: The model key.
        """
        self._loaded_model_list_.pop(key)
        if key in self._store_["predictions"]:
            self._store_["predictions"].pop(key)
        gc.collect()

        self._save_store_()

    def get_model_class(self, key: str) -> tuple:
        """Retrieve the model, label map, height and width given the model key.

        :param key: The model key.
        :return: The model class that the model key represents.
        """
        return self._loaded_model_list_[key]

    # PREDICTIONS
    def add_predictions(self, key: tuple, value: str) -> None:
        """Add predictions into the prediction cache.

        :param key: The prediction key as a tuple of:
            (model_id, image/video directory, additional_parameters)
        :param value: The predictions.
        """
        model_id = key[0]
        img_vid_dir = key[1]
        params = key[2]
        if model_id not in self._store_["predictions"]:
            self._store_["predictions"][model_id] = {}
        if img_vid_dir not in self._store_["predictions"][model_id]:
            self._store_["predictions"][model_id][img_vid_dir] = {}
        self._store_["predictions"][model_id][img_vid_dir][params] = value
        self._save_store_()

    def check_prediction_cache(self, key: tuple) -> bool:
        """Check if a prediction key is in the prediction cache."""
        return key[2] in list(
            self._store_["predictions"].get(key[0], {}).get(key[1], {}).keys()
        )

    def get_predicted_images(self, model_id: str) -> list:
        """Return a list of all successfully predicted images."""
        return list(self._store_["predictions"].get(model_id, {}).keys())

    def clear_predicted_images(self, model_id: str) -> None:
        """Clears the cache of predicted images of a model_id."""
        self._store_["predictions"].pop(model_id)
        gc.collect()
        self._save_store_()

    def get_predictions(self, key: tuple) -> Union[list, dict]:
        """Get the predictions given the prediction key.

        :param key: The prediction key.
        :return: The predictions.
        """
        return (
            self._store_["predictions"]
            .get(key[0], {})
            .get(key[1], {})
            .get(key[2], {})
        )

    def get_prediction_progress(self) -> dict:
        """Retrieve the _prediction_progress_ attribute."""
        return self._prediction_progress_

    def set_prediction_progress(self, status: str, progress: int, total: int):
        """Update the _prediction_progress_ attribute.

        See routes.py -> prediction_progress()
        :param status: string of either "none" or "video".
        :param progress: int of 1 or the current video frame.
        :param total: int of 1 or the the total frames in the video.
        """
        self._prediction_progress_["status"] = status
        self._prediction_progress_["progress"] = progress
        self._prediction_progress_["total"] = total

    # IMAGE AND FOLDERS
    def add_targeted_folder(self, new_path):
        """Add folder into the cache.

        :param new_path: The path of the folder.
        """
        self._targeted_folders_.add_folders(new_path)
        seriliazable_folders = jsonpickle.encode(self._targeted_folders_)
        self._store_["targeted_folders"] = seriliazable_folders
        self._save_store_()

    def update_targeted_folder(self, new_path):
        """Update the cache given the folder path

        :param new_path: The path of the folder.
        """
        self._targeted_folders_.update_folder(new_path)
        seriliazable_folders = jsonpickle.encode(self._targeted_folders_)
        self._store_["targeted_folders"] = seriliazable_folders
        self._save_store_()

    def update_all_targeted_folders(self):
        """Update the cache

        :param new_path: The path of the folder.
        """
        self._targeted_folders_.update_all_folders()
        seriliazable_folders = jsonpickle.encode(self._targeted_folders_)
        self._store_["targeted_folders"] = seriliazable_folders
        self._save_store_()

    def delete_targeted_folder(self, new_path):
        """Delete the folder path from the cache.

        :param new_path: The path of the folder.
        """
        self._targeted_folders_.delete_folder(new_path)
        seriliazable_folders = jsonpickle.encode(self._targeted_folders_)
        self._store_["targeted_folders"] = seriliazable_folders
        self._save_store_()

    def get_targeted_folders(self):
        """Getter for the targeted folders."""
        return self._targeted_folders_

    def set_image_list_cache(self, cache: str) -> None:
        """Setter for the image list cache.

        :param cache: The image list cache.
        """
        self._image_list_cache_ = cache

    def get_image_list_cache(self) -> list:
        """Getter for the image list cache"""
        return self._image_list_cache_

    def set_image_unchanged(self, boolean: bool) -> None:
        """Setter for the image_unchanged boolean."""
        self._image_unchanged_ = boolean

    def get_image_unchanged(self) -> bool:
        """Getter for the image_unchanged boolean."""
        return self._image_unchanged_
