import sys
import builtins
import webbrowser
import os
import subprocess

VALID_ARGUMENTS = [
    "--electron"
]

# If false means run locally
is_electron = False
curdir = os.path.abspath(os.curdir)
arguments = sys.argv

if "--electron" in arguments:
    is_electron = True

if is_electron:
    os.system("npm run portal-build")
else:
    # open an HTML file on computer
    filepath = os.path.join(curdir, "portal-build", "out", "index.html")
    print(filepath)
    url = f"file://{filepath}"
    webbrowser.open(url)
    os.chdir("./portal-build")
    if os.path.isdir(".venv"):
        if (sys.platform == "win32"):
            with open ('run.sh', 'w') as rsh:
                rsh.write('''\
            #! /bin/bash
            . .venv/Scripts/activate
            python run.py
            ''')
            os.system("run.sh")
            os.system("del run.sh")
        else:
            # Non windows
            os.system(". .venv/bin/activate && python3 -m run")
        
    else:
        # Run via global environment
        os.system("python3 -m run")
        
   
    os.chdir("..")

print("End of portal.py. Bye!")