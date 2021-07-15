import sys
import webbrowser
import os
from server import server, app, global_store
from flask import send_from_directory
from flask_cors import cross_origin


# If false means run locally
is_electron = False
is_gpu = False
arguments = sys.argv

root = os.path.join(os.path.abspath(os.curdir), "portal-build")
cache_dir = os.path.join(root, "server/cache/store.portalCache")
gpu_dir = os.path.join(root, "server/cache/use_gpu")


if "--electron" in arguments:
    is_electron = True


if "--gpu" in arguments:
    is_gpu = True
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write("0")
else:
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write("-1")


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
    global_store.set_is_cache_called(cache_dir)

    if is_electron:
        os.system("npm run portal-build")
    else:
        app._static_folder = os.path.join(root, "out", "static")
        webbrowser.open("http://localhost:9449")
        
        if not is_gpu:
            os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        else:
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"

        server.run()
