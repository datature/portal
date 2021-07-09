"""Main file to run the flask app."""
import os


def initialize() -> None:
    server.run()


use_gpu = "0"
if os.path.isfile("./server/cache/use_gpu"):
    with open("./server/cache/use_gpu", "r") as gpu_flag:
        use_gpu = gpu_flag.read()
else:
    with open("./server/cache/use_gpu", "w") as gpu_flag:
        gpu_flag.write(use_gpu)

if __name__ == "__main__":
    if use_gpu == "-1":
        os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
    else:
        os.environ["CUDA_VISIBLE_DEVICES"] = "0"


    # Ignore due to Pyshell
    # pylint: disable=E0401, E0611
    # pylint: disable=wrong-import-position
    from server import server

    initialize()
