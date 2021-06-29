#! /bin/sh
cd ./src/engine
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
pyinstaller -F run.py --hidden-import datature-hub --distpath ../../dist
echo "Removing extra files - run.spec and build"
rm -r run.spec build
cd ../..
echo "Ending build-python bash job in 10 secs..."
sleep 10
