#! /bin/bash

# exit when any command fails
set -e
# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "Exiting shell: \"${last_command}\" command failed with exit code $?."' EXIT

echo "Running build-electron bash job!"
chmod +x setup-virtualenv.sh build-python.sh 
echo "Calling setup-virtualenv.sh to setup environment in portal_build"
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
