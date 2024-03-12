#!/usr/bin/env python
# -*-coding:utf-8 -*-
"""
  ████
██    ██   Datature
  ██  ██   Powering Breakthrough AI
    ██

@File    :   portal.py
@Author  :   Beatrice Leong
@Version :   0.5.9
@Contact :   hello@datature.io
@License :   Apache License 2.0
@Desc    :   Script to run portal from the command line.
"""
import os
import sys

# If false means run locally
arguments = sys.argv
root = os.path.join(os.path.abspath(os.curdir), "portal_build")
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
gpu_dir = os.path.join(root, "server/cache/use_gpu")

if os.path.exists(root):
    os.environ["ROOT_DIR"] = root
    os.environ["COMMAND_LINE"] = "0"

    if "--electron" in arguments:
        os.environ["IS_ELECTRON"] = "0"

    if "--gpu" in arguments:
        os.environ["IS_GPU"] = "0"
        with open(use_gpu_dir, "w+", encoding="utf-8") as gpu_flag:
            gpu_flag.write("0")
    else:
        with open(use_gpu_dir, "w+", encoding="utf-8") as gpu_flag:
            gpu_flag.write("-1")

    use_cache = "0"
    if os.path.isfile(use_cache_dir):
        with open(use_cache_dir, "r", encoding="utf-8") as cache_flag:
            use_cache = cache_flag.read()
    else:
        with open(use_cache_dir, "w", encoding="utf-8") as cache_flag:
            cache_flag.write(use_cache)

    if os.getenv("IS_ELECTRON"):
        os.system("npm run portal_build")
    else:
        from portal_build.run import initialize  # pylint: disable=import-error

        initialize()

else:
    raise FileNotFoundError("Portal not installed or installation failed.")
