"""Main file to run the flask app."""

# Ignore due to Pyshell
# pylint: disable=E0401, E0611
import os
import webbrowser
from server import server, app, global_store
from flask import send_from_directory
from flask_cors import cross_origin


def initialize() -> None:
    server.run()


root = os.getcwd()
if os.getenv("ROOT_DIR") is not None:
    root = os.path.abspath(os.getenv("ROOT_DIR"))

env = os.getenv("ROOT_DIR")
print(f"ROOT_DIR {env}")
print(f"Root {root}")

cache_folder = os.path.join(root, "server/cache")
print(f"cache_folder {cache_folder}")

if not os.path.isdir(cache_folder):
    print(f"Making cache at cache_folder {cache_folder}")
    os.makedirs(cache_folder)
    with open(os.path.join(root, cache_folder, ".gitkeep"), "w") as gitkeep:
        pass

print(f"At this stage a server/cache should be created.")

model_dir = os.path.join(root, "server/hub_models")
cache_dir = os.path.join(root, cache_folder, "store.portalCache")
gpu_dir = os.path.join(root, cache_folder, "use_gpu")
print(f"model_dir {model_dir}")
print(f"cache_dir {cache_dir}")
print(f"gpu_dir {gpu_dir}")

use_gpu = "0"
if os.path.isfile(gpu_dir):
    with open(gpu_dir, "r") as gpu_flag:
        use_gpu = gpu_flag.read()
else:
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write(use_gpu)

if os.getenv("COMMAND_LINE"):
    @app.route('/')
    @cross_origin()
    def index():
        filepath = os.path.join(root, "out")
        print(filepath)
        return send_from_directory(filepath, "index.html")

    @app.route('/<path:path>')
    @cross_origin()
    def send_paths(path):
        filepath = os.path.join(root, "out", path)

        head, tail = os.path.split(filepath)
        return send_from_directory(head, tail)

if __name__ == "__main__":
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

    initialize()
