#! /bin/sh

echo "Running setup bash job!"
echo "Installing Nextjs Environment for Portal..."
npm install
cd ./src/app
npm install

echo "Building and Exporting related app files to portal-build..."
npm run build:static

cd ../..

echo "Copying portal.py to portal-build..."
cp portal.py ./portal-build

echo "Copying related app files to portal-build..."
cp ./src/app/main.js ./portal-build
cp ./src/app/preload.js ./portal-build

echo "Copying related engine files to portal-build..."
cp -R ./src/engine/server ./portal-build
cp ./src/engine/run.py ./portal-build
cp ./src/engine/Pipfile.lock ./portal-build
cp ./src/engine/Pipfile ./portal-build

cd ./portal-build
echo "Installing Python Environment in portal-build..."
echo "$OSTYPE"
if [[ "$OSTYPE" == "msys" ]]; then
python -m pip install --upgrade pip
python -m pip install pipenv
else
python3 -m pip install --upgrade pip
python3 -m pip install pipenv
fi
PIPENV_VENV_IN_PROJECT=1 PIPENV_DEFAULT_PYTHON_VERSION=3.7 pipenv sync -d

cd ..

echo "Ending setup bash job in 10 secs..."
sleep 10
