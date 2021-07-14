#! /bin/sh

echo "Running build-electron bash job!"
chmod +x setup-virtualenv.sh build-python.sh 
echo "Calling setup-virtualenv.sh to setup environment in portal-build"
. setup-virtualenv.sh 
echo "Calling build-python.sh to build backend executable"
. build-python.sh 
cd ./src/app
echo "Building Frontend for Portal..."
npm run build:static 
cd ../..
echo "Building Executable for Portal..."
npm run dist
echo "Ending build-electron bash job in 10 secs..."
sleep 10
