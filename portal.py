
import os
import sys

# If false means run locally
arguments = sys.argv

root = os.path.join(os.path.abspath(os.curdir), "portal-build")
gpu_dir = os.path.join(root, "server/cache/use_gpu")


os.environ["ROOT_DIR"] = root
os.environ["COMMAND_LINE"] = "0"

if "--electron" in arguments:
    os.environ["IS_ELECTRON"] = "0"

if "--gpu" in arguments:
    os.environ["IS_GPU"] = "0"
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write("0")
else:
    with open(gpu_dir, "w") as gpu_flag:
        gpu_flag.write("-1")

if os.getenv("IS_ELECTRON"):
    os.system("npm run portal-build")
else:
    if (sys.platform == "win32" or sys.platform == "linux"):
        os.system("python portal-build/run.py")
    else:
        # Non windows
        os.system("python3 -m portal-build/run")
