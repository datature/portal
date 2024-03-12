#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   run.py
@Author  :   Marcus Neo
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Main file to run the flask app.
"""

import os

# Ignore due to Pyshell
# pylint: disable=E0401, E0611
import sys
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

if os.getenv("ROOT_DIR") is not None:
    root = os.path.abspath(os.getenv("ROOT_DIR"))

env = os.getenv("ROOT_DIR")

cache_folder = os.path.join(root, "server/cache")
model_folder = os.path.join(root, "server/hub_models")
variables_folder = os.path.join(root, "server/var")

# If these folders do not exist (perhaps first time using the program),
# create the folders.
for folder in [cache_folder, model_folder, variables_folder]:
    if not os.path.isdir(folder):
        os.makedirs(folder)

use_gpu_dir = os.path.join(variables_folder, "gpu.var")
cache_dir = os.path.join(cache_folder, "store.portalCache")
use_cache_dir = os.path.join(variables_folder, "cache.var")

# predefine the variables
use_gpu = "0"
use_cache = "0"

# update the variables
if os.path.isfile(use_gpu_dir):
    with open(use_gpu_dir, "r", encoding="utf-8") as gpu_flag:
        use_gpu = gpu_flag.read()
else:
    with open(use_gpu_dir, "w", encoding="utf-8") as gpu_flag:
        gpu_flag.write(use_gpu)

if os.path.isfile(use_cache_dir):
    with open(use_cache_dir, "r", encoding="utf-8") as cache_flag:
        use_cache = cache_flag.read()
else:
    with open(use_cache_dir, "w", encoding="utf-8") as cache_flag:
        cache_flag.write("use_cache")

os.environ["ROOT_DIR"] = root
os.environ["CACHE_DIR"] = cache_dir
os.environ["GPU_DIR"] = use_gpu_dir
os.environ["MODEL_DIR"] = model_folder
os.environ["USE_CACHE"] = use_cache
os.environ["USE_CACHE_DIR"] = use_cache_dir

# pylint: disable=wrong-import-position
from server import app, global_store, server  # noqa: E402

if os.getenv("COMMAND_LINE"):

    @app.route("/")
    @cross_origin()
    def index_page():
        filepath = os.path.join(root, "out")
        return send_from_directory(filepath, "index.html")

    @app.route("/<path:path>")
    @cross_origin()
    def send_paths(path):
        filepath = os.path.join(root, "out", path)

        head, tail = os.path.split(filepath)
        return send_from_directory(head, tail)


def initialize() -> None:
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
