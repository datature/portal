"""Main file to run the flask app."""
import os

# Ignore due to Pyshell
# pylint: disable=E0401, E0611
# pylint: disable=wrong-import-position
from server import server, global_store


def initialize() -> None:
    server.run()


root = os.path.abspath(os.curdir)
if os.getenv("ROOT_DIR") is not None:
    root = os.path.abspath(os.getenv("ROOT_DIR"))

cache_folder = os.path.join(root, "server/cache")
if not os.path.isdir(cache_folder):
    os.makedirs(cache_folder)
    with open(os.path.join(root, cache_folder, ".gitkeep"), "w") as gitkeep:
        pass

cache_dir = os.path.join(root, cache_folder, "store.portalCache")
gpu_dir = os.path.join(root, "server/cache/use_gpu")

use_gpu = "0"
if os.path.isfile(gpu_dir):
    with open(gpu_dir, "r") as gpu_flag:
        use_gpu = gpu_flag.read()
else:
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write(use_gpu)

if __name__ == "__main__":
    os.environ["ROOT_DIR"] = root
    os.environ["CACHE_DIR"] = cache_dir
    os.environ["GPU_DIR"] = gpu_dir
    global_store.set_is_cache_called(cache_dir)

    if use_gpu == "-1":
        os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
    else:
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"

    initialize()
