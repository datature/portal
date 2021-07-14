#! /bin/bash

# exit when any command fails
set -e
# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "Exiting shell: \"${last_command}\" command failed with exit code $?."' EXIT

echo "Running build-python bash job!"
cd ./portal-build
echo "$OSTYPE"
if [[ "$OSTYPE" == "msys" ]]; then
echo "Activating .venv/Scripts/activate"
. .venv/Scripts/activate
else
echo "Activating .venv/bin/activate"
. .venv/bin/activate
fi
echo "Installing Pyinstaller..."
pip install --upgrade pyinstaller
echo "Creating flask executable..."
pyinstaller -F run.py --hidden-import datature-hub --hidden-import engineio.async_drivers.threading  --distpath ./dist
echo "Removing extra files - run.spec and build"
rm -r run.spec build
cd ..
echo "Ending build-python bash job in 10 secs..."
sleep 10
