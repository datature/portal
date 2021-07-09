import sys
import webbrowser
import os
from server import server, app
from flask import send_from_directory
from flask_cors import cross_origin


# If false means run locally
is_electron = False
is_gpu = False
curdir = os.path.abspath(os.curdir)
arguments = sys.argv

if "--electron" in arguments:
    is_electron = True


if "--gpu" in arguments:
    is_gpu = True
    with open("./server/cache/use_gpu", "w") as gpu_flag:
        gpu_flag.write("0")
else:
    with open("./server/cache/use_gpu", "w") as gpu_flag:
        gpu_flag.write("-1")


@app.route('/')
@cross_origin()
def index():
    filepath = os.path.join(curdir, "out")
    return send_from_directory(filepath, "index.html")

@app.route('/<path:path>')
@cross_origin()
def send_paths(path):
    filepath = os.path.join(curdir, "out", path)
    
    head, tail = os.path.split(filepath)
    return send_from_directory(head, tail)


if __name__ == "__main__":
    if is_electron:
        os.system("npm run portal-build")
    else:
        app._static_folder = os.path.join(curdir, "out", "static")
        webbrowser.open("http://localhost:5000")
        
        if not is_gpu:
            os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        else:
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"

        server.run()
