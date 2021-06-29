#! /bin/sh

echo "Installing Electron Environment for Portal..."
npm install

chmod +x setup.sh build-python.sh 
. setup.sh 
echo "Building Backend for Portal..."
. build-python.sh 
cd ./src/app
echo "Building Frontend for Portal..."
npm run build:static 
cd ../..
echo "Building Executable for Portal..."
npm run dist
echo "Ending build-electron bash job in 10 secs..."
sleep 10
