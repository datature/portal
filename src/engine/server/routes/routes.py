#!/usr/bin/env python
# -*-coding:utf-8 -*-
'''
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   routes.py
@Author  :   Marcus Neo and Beatrice Leong
@Version :   0.5.8
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Module containing all API routes.
'''
import os
from functools import wraps

from flask import Response, jsonify, request, send_file, send_from_directory
from flask_cors import cross_origin

# Ignore import-error and no-name-in-module due to Pyshell
# pylint: disable=E0401, E0611, E1135
# pylint: disable=cyclic-import
# pylint: disable=undefined-variable

from server import app, global_store, logger, server, wait_for_process
from server.services import decode, encode

from server.services.errors import Errors, PortalError
from server.services.filesystem.file import (
    allowed_image,
    allowed_video,
    generate_thumbnail,
)
from server.services.model_loader import model_loader
from server.services.model_register import (
    register_endpoint,
    register_hub,
    register_local,
)

from server.services.predictions import predict_image, predict_video
from server.utils.prediction_utilities import corrected_predict_query


def portal_function_handler(clear_status: bool) -> callable:
    """Decorator to handle all API functions.

    Responsibilities:
        1. clear the global store atomic status only for functions that
           meet the requirements
        2. handles the case of simultaneous api calls
           (2 or more same calls in a split second)
        3. handles exceptions of all functions, converts them to be
           read by front-end and logs
    """

    def decorator(func):

        @wraps(func)
        def wrapper(*args, **kwargs):

            # Error handling section
            try:
                fn_output = func(*args, **kwargs)

                # Handling simultaneous API calls
                global_store.set_caught_response(func.__name__, fn_output)
                if clear_status:
                    global_store.clear_status()
                response = fn_output

            except PortalError as e:
                if logger is not None:
                    logger.exception(e)
                e.set_fail_location(" - ".join(
                    [func.__module__, func.__name__]))
                if e.get_error() != "ATOMICERROR" and clear_status:
                    global_store.clear_status()
                response = e.output()
            except Exception as e:  # pylint: disable=broad-except
                if logger is not None:
                    logger.exception(e)
                if clear_status:
                    global_store.clear_status()

                response = PortalError(
                    Errors.UNKNOWN,
                    str(e),
                    " - ".join([func.__module__, func.__name__]),
                ).output()

            return response

        return wrapper

    return decorator


@app.before_request
def before_request():
    """
    To update the global time each time a request is made
    """
    global_store.set_still_alive()


@app.route("/shutdown", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def shutdown():
    """
    Shutdown the server
    """
    if request.args.get("deleteCache"):
        global_store.delete_cache()
    server.socket.stop()
    return "Server shutting down...", 200


@app.route("/heartbeat", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def heartbeat() -> tuple:
    """Check if server is alive."""
    is_electron = request.args.get("isElectron")
    if is_electron == "true":
        global_store.set_start_scheduler()
    output = {
        "hasCache": global_store.has_cache(),
        "isCacheCalled": global_store.is_cache_called(),
    }
    return jsonify(output), 200


@app.route("/api/model/predict/video/kill", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def kill_video() -> Response:
    """Stop the current video prediction route."""
    status = global_store.get_status()
    if status is not None and "predict_video_" in status:
        global_store.set_stop()
    return Response(status=200)


@app.route("/api/model/predict/status", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def prediction_progress() -> Response:
    """Get the current progress of the prediction.

    Returns payload in the format
    {
        "status": "none" (for image/idle) | "video" (for video),
        "progress": 1 (for image/idle) | <current_frame_count> (for video),
        "total": 1 (for image/idle) | <total_frames_in_video> (for video),
    }
    """
    return jsonify(global_store.get_prediction_progress())


@app.route("/autosave/toggle/<toggle_type>", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def autosave_toggle(toggle_type: str) -> Response:
    """Turn toggle the caching system during runtime."""
    if toggle_type == "off":
        global_store.turn_off_autosave()
    elif toggle_type == "on":
        global_store.turn_on_autosave()
    else:
        raise PortalError(Errors.INVALIDAPI, "Invalid toggle " + toggle_type)
    return Response(status=200)


@app.route("/autosave", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def query_autosave() -> Response:
    """Query the caching system during runtime."""
    autosave_status = global_store.query_autosave()
    return Response(status=200, response=autosave_status)


@app.route("/cache", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def load_cache() -> Response:
    """Load the cache."""
    global_store.load_cache()
    return Response(status=200)


@app.route("/cache", methods=["PUT"])
@cross_origin()
@portal_function_handler(clear_status=False)
def reject_cache() -> Response:
    """Set cache is called."""
    global_store.cache_is_called()
    return Response(status=200)


@app.route("/set_gpu", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def set_gpu() -> Response:
    """Set the GPU flag to true."""
    with open(os.getenv("GPU_DIR"), "w", encoding="utf-8") as gpu_flag:
        gpu_flag.write("0")
    return Response(status=200)


@app.route("/clear_gpu", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def clear_gpu() -> Response:
    """Clear the GPU flag."""
    with open(os.getenv("GPU_DIR"), "w", encoding="utf-8") as gpu_flag:
        gpu_flag.write("-1")
    return Response(status=200)


@app.route("/get_gpu", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_gpu() -> Response:
    """Get the GPU flag."""
    return Response(status=200, response=os.getenv("CUDA_VISIBLE_DEVICES"))


@app.route("/api/model/register", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=True)
def register_model() -> tuple:
    """Register tf model from local file.

    :return: Tuple of jsonified registered model list and 200 if successful.

    Possible Errors:
        NOAPIBODY:      API body is required but not given.
        INVALIDAPI:     API body is given but it's contents is wrong.
    """
    try:
        # Check for empty API Body.
        data = request.get_json()
        if not data:
            raise PortalError(Errors.NOAPIBODY,
                              "API body is required but not given.")

        # Initialize data.
        input_type: str = data["type"]
        input_credentials: dict = data["credentials"]
        model_name: str = data["name"]
        model_description: str = data["description"]
        model_key: str = input_credentials["modelKey"]
        project_secret: str = input_credentials["projectSecret"]
        model_url: str = input_credentials["modelURL"]
        model_type: str = data["modelType"]
        input_directory: str = data["directory"]
        if global_store.set_status("register_model_" + model_key):
            wait_for_process()
            return global_store.get_caught_response("register_model_")

        # Check for invalid inputs.
        if input_type not in ["local", "endpoint", "hub"]:
            raise PortalError(
                Errors.INVALIDAPI,
                str(input_type) + "is not one of 'local', 'endpoint' or 'hub.",
            )

        if input_type == "local" and (model_key != "" or project_secret != ""):
            raise PortalError(
                Errors.INVALIDAPI,
                "both model_key and project_secret should not "
                "be given if input_type is 'local'.",
            )

        if input_type == "local" and input_directory == "":
            raise PortalError(
                Errors.INVALIDAPI,
                "directory needs to be given if input_type is 'local'",
            )

        if input_type == "hub" and model_key == "":
            raise PortalError(
                Errors.INVALIDAPI,
                "model_key needs to be given if input_type is 'hub'.",
            )
        if input_type == "endpoint" and (model_url == ""
                                         or project_secret == ""):
            raise PortalError(
                Errors.INVALIDAPI,
                "Endpoint URL / project_secret "
                "needs to be given if input_type is 'endpoint'.",
            )

        if input_type in ["hub", "endpoint"] and model_type != "autodetect":
            raise PortalError(
                Errors.INVALIDAPI,
                "only autodetect models are supported for Hub.",
            )
        # Register the model using the respective registration code.
        if input_type == "local":
            register_local(input_directory, model_type, model_name,
                           model_description)

        if input_type == "hub":
            register_hub(
                model_key,
                project_secret,
                model_name,
                model_description,
            )

        if input_type == "endpoint":
            register_endpoint(
                link=model_url,
                project_secret=project_secret,
                name=model_name,
                description=model_description,
            )

        return (jsonify(global_store.get_registered_model_info()), 200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except KeyError as e:
        raise PortalError(Errors.INVALIDAPI, str(e)) from e


@app.route("/api/model/<model_id>/tags", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_tag(model_id: str) -> tuple:
    """Obtain the label_map of the model given its model key.

    :param model_id: The model key.
    :return: Tuple of jsonified label_map and 200 if successful.

    Possible Errors:
        UNINITIALIZED: There are no registered models.
    """
    try:
        registered_model = global_store.get_registered_model(model_id)
        label_map = registered_model.get_label_map()
        output = {value["name"]: value["id"] for _, value in label_map.items()}

        return (jsonify(output), 200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except KeyError as e:
        raise PortalError(Errors.INVALIDMODELKEY, str(e)) from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILEPATH, str(e)) from e


@app.route("/api/model/<model_id>", methods=["DELETE"])
@cross_origin()
@portal_function_handler(clear_status=True)
def deregister_model(model_id: str) -> Response:
    """Deregister the model given its key.

    ~THIS FUNCTION IS ATOMIC~
    :param model_id: The model key.
    :return: Response of status 200 if successful.

    Possible Errors:
        INVALIDMODELKEY:    Model key does not exist in registered model list.
    """
    if global_store.set_status("DeregisterModel_" + model_id):
        wait_for_process()
        return global_store.get_caught_response("deregister_model")

    try:
        if model_id in global_store.get_loaded_model_keys():
            global_store.unload_model(model_id)

        global_store.del_registered_model(model_id)
        return Response(status=200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except KeyError as e:
        raise PortalError(Errors.INVALIDMODELKEY, str(e)) from e


@app.route("/api/model", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_registry() -> tuple:
    """Obtain the dictionary with all registered models as
        key and their directory as value.

    :return: Jsonified dictionary of registered models and 200.
    """
    return (jsonify(global_store.get_registered_model_info()), 200)


@app.route("/api/model/loadedList", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_loaded_list() -> tuple:
    """Obtain the list of all loaded models.

    :return: Jsonified list of loaded models and 200.
    """
    return (jsonify(global_store.get_loaded_model_keys()), 200)


@app.route("/api/model/<model_id>/load", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=True)
def load_model(model_id: str) -> Response:
    """Load the model.

    ~THIS FUNCTION IS ATOMIC~

    :param model_id: The model key.
    :return: Response of status 200 if successful.

    Possible Errors:
        See Respective load functions.
    """
    if global_store.set_status("LoadModelFromFile_" + model_id):
        wait_for_process()
        return global_store.get_caught_response("load_model")
    if global_store.check_model_limit():
        raise PortalError(Errors.OVERLOADED, "Maximum loadable model reached.")
    return model_loader(model_id)


@app.route("/api/model/<model_id>/unload", methods=["PUT"])
@cross_origin()
@portal_function_handler(clear_status=True)
def unload_model(model_id: str) -> Response:
    """Unload tensorflow model

    ~THIS FUNCTION IS ATOMIC~

    :param model_id: The model key.
    :return: Response of status 200 if successful.
    """
    if global_store.set_status("UnloadModel_" + model_id):
        wait_for_process()
        return global_store.get_caught_response("unload_model")
    if model_id in global_store.get_loaded_model_keys():
        global_store.unload_model(model_id)
    return Response(status=200)


# pylint: disable=too-many-statements, too-many-return-statements
@app.route("/api/model/<model_id>/predict", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=True)
def predict_single_image(model_id: str) -> tuple:
    """Predict a single image.

    ~THIS FUNCTION IS ATOMIC~

    :param model_id: The model key.
    :QueryParam filepath: (Compulsory) The path of the image to be
                                       sent for prediction.
    :QueryParam format: (Optional) Output format.
                                   Either "json" or "image".
                                   Default is "json".
    :QueryParam iou: (Optional) Intersection of Union for
                                Bounding Boxes/Masks.
                                Requires float in the range of [0.0,1.0].
                                Default is 0.8.
    :QueryParam filter: (Optional) Obtain the outputs of
                                   only the specified class.
    :QueryParam reanalyse: (Optional) Flag to bypass cache and
                                      force reanalysis.
    :return: Jsonified tuple of (either json detections of image)
             and 200 if successful.

    Possible Errors:
        UNINITIALIZED:      Empty loaded model list.
        INVALIDFILETYPE:    Image file extension is not allowed.
        INVALIDQUERY:       Wrongly given query parameters.
        FAILEDPREDICTION:   Prediction failed.
                            See error message for more information.
        NOTFOUND:           Image directory not found.
        INVALIDMODELKEY:    Model key is not in loaded model list.
    """
    try:
        if request.args.get("filepath") is None:
            raise PortalError(Errors.INVALIDQUERY,
                              "Filepath is a compulsory query")

        image_directory = decode(request.args.get("filepath"))
        if not os.path.isfile(image_directory):
            raise PortalError(Errors.NOTFOUND,
                              "Image is not found from filepath param")
        if not allowed_image(image_directory):
            raise PortalError(Errors.INVALIDFILETYPE, image_directory)

        corrected_dict = corrected_predict_query("format",
                                                 "iou",
                                                 request=request)
        format_arg = corrected_dict["format"]
        iou = corrected_dict["iou"]
        reanalyse = corrected_dict["reanalyse"]
        prediction_key = (
            model_id,
            image_directory,
            format_arg + str(iou),
        )
        prediction_status = ("predict_single_image_" + model_id +
                             image_directory + format_arg + str(iou))
        # check if another atomic process / duplicate process exists
        if global_store.set_status(prediction_status):
            wait_for_process()
            return global_store.get_caught_response("predict_single_image")
        # reanalyse needs to be false, and the prediction cache must
        # contain the corresponding output, in order for the cache to be
        # served. else, we continue prediction as per norma
        if (global_store.check_prediction_cache(prediction_key)
                and reanalyse is False):
            output = global_store.get_predictions(prediction_key)
        else:
            if not global_store.get_loaded_model_keys():
                raise PortalError(Errors.UNINITIALIZED, "No Models loaded.")
            if model_id not in global_store.get_loaded_model_keys():
                raise PortalError(Errors.NOTFOUND, "model_id not loaded.")

            model_class = global_store.get_model_class(model_id)

            output = predict_image(model_class, format_arg, iou,
                                   image_directory)
            global_store.add_predictions(prediction_key, output)

        return (jsonify(output), 200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except FileNotFoundError as e:
        raise PortalError(Errors.NOTFOUND, str(e)) from e
    except KeyError as e:
        raise PortalError(Errors.INVALIDMODELKEY, str(e)) from e


@app.route("/api/model/<model_id>/predict/video", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=True)
def predict_video_fn(model_id: str) -> tuple:
    """Predict a video.

    ~THIS FUNCTION IS ATOMIC~

    :param model_id: The model key.
    :QueryParam filepath: (Compulsory) The path of the image to be sent
                                       for prediction.
    :QueryParam frameInterval: (Compulsory) The interval between frames
    :QueryParam iou: (Optional) Intersection of Union for
                                Bounding Boxes/Masks.
        Requires float in the range of [0.0,1.0]. Default is 0.8.
    :QueryParam filter: (Optional) Obtain the outputs of only the
                                   specified class.
    :QueryParam confidence: (Optional) The confidence threshold.
    :QueryParam reanalyse: (Optional) Flag to bypass cache and
                                      force reanalysis.
    :return: Jsonified tuple of (either json detections of image)
             and 200 if successful.

    Possible Errors:
        UNINITIALIZED:      Empty loaded model list.
        INVALIDFILETYPE:    Image file extension is not allowed.
        INVALIDQUERY:       Wrongly given query parameters.
        FAILEDPREDICTION:   Prediction failed.
                            See error message for more information.
        NOTFOUND:           Image directory not found.
        INVALIDMODELKEY:    Model key is not in loaded model list.
    """
    try:
        if request.args.get("filepath") is None:
            raise PortalError(Errors.INVALIDQUERY,
                              "Filepath is a compulsory query")
        if request.args.get("frameInterval") is None:
            raise PortalError(Errors.INVALIDQUERY,
                              "frameInterval is a compulsory query")
        frame_interval = int(request.args.get("frameInterval"))
        video_directory = decode(request.args.get("filepath"))
        if not os.path.isfile(video_directory):
            raise PortalError(Errors.NOTFOUND,
                              "Video is not found from filepath param")
        if not allowed_video(video_directory):
            raise PortalError(Errors.INVALIDFILETYPE, video_directory)

        corrected_dict = corrected_predict_query("iou",
                                                 "confidence",
                                                 request=request)
        iou = corrected_dict["iou"]
        confidence = corrected_dict["confidence"]
        reanalyse = corrected_dict["reanalyse"]
        prediction_key = (
            model_id,
            video_directory,
            str(frame_interval) + str(iou) + str(confidence),
        )
        prediction_status = ("predict_video_" + model_id + video_directory +
                             str(frame_interval) + str(iou) + str(confidence))
        if global_store.set_status(prediction_status):
            wait_for_process()
            return global_store.get_caught_response("predict_video")

        # reanalyse needs to be false, and the prediction cache must
        # contain the corresponding output, in order for the cache to be
        # served. else, we continue prediction as per norma
        if (global_store.check_prediction_cache(prediction_key)
                and reanalyse is False):
            output = global_store.get_predictions(prediction_key)
        else:
            if not global_store.get_loaded_model_keys():
                raise PortalError(Errors.UNINITIALIZED, "No Models loaded.")
            if model_id not in global_store.get_loaded_model_keys():
                raise PortalError(Errors.NOTFOUND, "model_id not loaded.")
            model_class = global_store.get_model_class(model_id)

            output = predict_video(
                model_class,
                iou=iou,
                video_directory=video_directory,
                frame_interval=frame_interval,
                confidence=confidence,
            )
            global_store.add_predictions(prediction_key, output)

        return (jsonify(output), 200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except FileNotFoundError as e:
        raise PortalError(Errors.NOTFOUND, str(e)) from e
    except KeyError as e:
        raise PortalError(Errors.INVALIDMODELKEY, str(e)) from e
    except ValueError as e:
        raise PortalError(Errors.INVALIDQUERY, str(e)) from e


@app.route("/api/model/<model_id>/cachelist", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_cachelist(model_id) -> tuple:
    """Obtain the list of images that has been successfully predicted."""
    cachelist = [
        encode(image_dir)
        for image_dir in global_store.get_predicted_images(model_id)
    ]
    return (jsonify(cachelist), 200)


@app.route("/api/model/<model_id>/cachelist", methods=["DELETE"])
@cross_origin()
@portal_function_handler(clear_status=False)
def clear_cachelist(model_id) -> tuple:
    """Clear the cached list of predictions."""
    global_store.clear_predicted_images(model_id)
    return Response(status=200)


@app.route("/api/project/register", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def register_images() -> Response:
    """Register the image directory.

    1. Sets the given file path (decoded) to retrieve the images
    2. Recursively searches for images within the folder
    :return: Array of image file names
    """
    try:
        path = request.json["directory"]
        global_store.add_targeted_folder(path)

        return Response(response="Successfully registered the targeted folder",
                        status=200)
    except KeyError as e:
        raise PortalError(Errors.INVALIDAPI, str(e)) from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILEPATH, str(e)) from e


@app.route("/api/project/sync", methods=["POST"])
@cross_origin()
@portal_function_handler(clear_status=False)
def sync_images():
    """
    Sync the folder targets for updated contents
    """
    path = request.json.get("directory")
    if not path:
        global_store.update_all_targeted_folders()
    else:
        global_store.update_targeted_folder(path)
    return Response(response="Sync was successful", status=200)


@app.route("/api/project", methods=["DELETE"])
@cross_origin()
@portal_function_handler(clear_status=False)
def delete_folder() -> Response:
    """
    Deletes the folder with the specified folder_path (encoded with utf-8)
    """
    try:

        folder_path = request.args.get("folderpath")
        if folder_path is None:
            raise PortalError(Errors.INVALIDQUERY, "folderpath not specified.")

        global_store.delete_targeted_folder(folder_path)
        return Response(response="Deletion was successful", status=200)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except TypeError as e:
        raise PortalError(Errors.NOAPIBODY,
                          "API body is required but not given.") from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILETYPE, str(e)) from e


@app.route("/api/project/assets", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_assets():
    """
    Get the assets full file path
    """
    return (
        jsonify(global_store.get_targeted_folders().get_assets()),
        200,
    )


@app.route("/api/project/assets/tree", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_tree():
    """
    Get the assets in a tree format
    """
    return (
        jsonify(global_store.get_targeted_folders().get_tree()),
        200,
    )


@app.route("/api/project/assets/image", methods=["GET"])
@cross_origin()
@portal_function_handler(clear_status=False)
def get_image():
    """
    Get the image with specified file path
    """
    try:
        path = request.args.get("filepath")
        decoded_path = decode(path)
        if not os.path.exists(decoded_path):
            raise FileNotFoundError(
                f"File path {decoded_path} does not exists")
        head, tail = os.path.split(decoded_path)
        return send_from_directory(head, tail)

    # Except Block
    # Catches all possible native exceptions here and
    # translates them into PortalError.
    except KeyError as e:
        raise PortalError(Errors.INVALIDAPI, str(e)) from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILEPATH, str(e)) from e


@app.route("/api/project/assets/thumbnail", methods=["GET"])
def get_thumbnail():
    """
    Get the thumbnail with specified file path
    """
    try:
        path = request.args.get("filepath")
        decoded_path = decode(path)
        if not os.path.exists(decoded_path):
            raise FileNotFoundError(
                f"File path {decoded_path} does not exists")
        # pylint: disable=unused-variable
        head, tail = os.path.split(decoded_path)
        image_bytes = generate_thumbnail(decoded_path, tail)
        return send_file(image_bytes, mimetype="image/jpeg")

    except KeyError as e:
        raise PortalError(Errors.INVALIDAPI, str(e)) from e
    except FileNotFoundError as e:
        raise PortalError(Errors.INVALIDFILEPATH, str(e)) from e
