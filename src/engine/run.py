"""Main file to run the flask app."""
import os


def initialize() -> None:
    server.run()


with open("./use_gpu", "r") as gpu_flag:
    use_gpu = gpu_flag.read()


if __name__ == "__main__":
    if use_gpu == "-1":
        os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

    # Ignore due to Pyshell
    # pylint: disable=E0401, E0611
    # pylint: disable=wrong-import-position
    from server import server

    initialize()
