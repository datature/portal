#! /bin/sh

echo "Running setup bash job!"
echo "Installing Nextjs Environment for Portal..."
npm install
cd ./src/app
npm install

echo "Building and Exporting related app files to portal-build..."
npm run build:static

cd ../..

echo "Copying related app files to portal-build..."
cp ./src/app/main.js ./portal-build
cp ./src/app/preload.js ./portal-build

echo "Copying related engine files to portal-build..."
cp -R ./src/engine/server ./portal-build
cp ./src/engine/run.py ./portal-build

cd ./src/engine
echo "Installing Python Environment in portal-build..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

cd ../..

echo "Ending setup bash job in 10 secs..."
sleep 10
