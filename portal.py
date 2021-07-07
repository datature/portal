import sys
import webbrowser
import os
from server import server, app
from flask import send_from_directory
from flask_cors import cross_origin


# If false means run locally
is_electron = False
curdir = os.path.abspath(os.curdir)
arguments = sys.argv

if "--electron" in arguments:
    is_electron = True

@app.route('/')
@cross_origin()
def index():
    filepath = os.path.join(curdir, "portal-build", "out")
    return send_from_directory(filepath, "index.html")

@app.route('/<path:path>')
@cross_origin()
def send_paths(path):
    filepath = os.path.join(curdir, "portal-build", "out", path)
    
    head, tail = os.path.split(filepath)
    return send_from_directory(head, tail)


if __name__ == "__main__":

    if is_electron:
        os.system("npm run portal-build")
    else:
        app._static_folder = os.path.join(curdir, "portal-build", "out", "static")
        webbrowser.open("http://localhost:5000")
        server.run()
        
