#! /bin/sh

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
