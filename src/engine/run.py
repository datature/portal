"""Main file to run the flask app."""

# Ignore due to Pyshell
# pylint: disable=E0401, E0611
import sys
import os

import webbrowser
from flask import send_from_directory
from flask_cors import cross_origin

# Change root folder to build folder directory
root = os.getcwd()

arguments = sys.argv
if "--root" in arguments:
    index = arguments.index("--root")
    root = arguments[index + 1]

if os.getenv("COMMAND_LINE"):
    root = os.path.join(root, "portal_build")
    sys.path.append(root)

# pylint: disable=wrong-import-position
from server import server, app, global_store


if os.getenv("ROOT_DIR") is not None:
    root = os.path.abspath(os.getenv("ROOT_DIR"))

env = os.getenv("ROOT_DIR")

cache_folder = os.path.join(root, "server/cache")

if not os.path.isdir(cache_folder):
    os.makedirs(cache_folder)
    with open(os.path.join(root, cache_folder, ".gitkeep"), "w") as gitkeep:
        pass

model_dir = os.path.join(root, "server/hub_models")
cache_dir = os.path.join(root, cache_folder, "store.portalCache")
gpu_dir = os.path.join(root, cache_folder, "use_gpu")

use_gpu = "0"
if os.path.isfile(gpu_dir):
    with open(gpu_dir, "r") as gpu_flag:
        use_gpu = gpu_flag.read()
else:
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write(use_gpu)

if os.getenv("COMMAND_LINE"):

    @app.route("/")
    @cross_origin()
    def index():
        filepath = os.path.join(root, "out")
        return send_from_directory(filepath, "index.html")

    @app.route("/<path:path>")
    @cross_origin()
    def send_paths(path):
        filepath = os.path.join(root, "out", path)

        head, tail = os.path.split(filepath)
        return send_from_directory(head, tail)


def initialize() -> None:
    os.environ["ROOT_DIR"] = root
    os.environ["CACHE_DIR"] = cache_dir
    os.environ["GPU_DIR"] = gpu_dir
    os.environ["MODEL_DIR"] = model_dir
    global_store.set_is_cache_called(cache_dir)

    if use_gpu == "-1":
        os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
    else:
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"

    if os.getenv("COMMAND_LINE"):
        if not os.getenv("IS_ELECTRON"):
            # pylint: disable=W0212
            app._static_folder = os.path.join(root, "out", "static")
            webbrowser.open("http://localhost:9449")

            if not os.getenv("IS_GPU"):
                os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
                os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
            else:
                os.environ["CUDA_VISIBLE_DEVICES"] = "0"

    server.run()


if not os.getenv("COMMAND_LINE") or os.getenv("IS_ELECTRON"):
    initialize()
