#! /bin/bash

# exit when any command fails
set -e
# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "Exiting shell: \"${last_command}\" command failed with exit code $?."' EXIT

declare -a FILES_NEEDED=(./src/app/main.js ./src/app/preload.js ./src/engine/run.py)
missing_files="false"

check_if_node_exists() {
if which npm > /dev/null; then
  echo "NPM Found! Installing Electron dependencies..."
  return 0
else
  echo "Skipping the setup for Electron. You Need to have NPM first. "
  return 1
fi
}

check_if_file_exists() {
if ! test -f $1; then
  missing_files="true"
  echo "$1 does not exist."
fi
}


echo "Running setup bash job!"

for file in "${FILES_NEEDED[@]}"
do
check_if_file_exists $file
done
if [[ "$missing_files" == "true" ]]; then 
echo "Quitting bash job due to missing files. Ensure you have the required files before continuing."
exit 0
fi

if check_if_node_exists; then 
echo "Installing Nextjs Environment for Portal..."
npm install
cd ./src/app
npm install
else 
cd ./src/app
fi

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
echo "$OSTYPE"
if [[ "$OSTYPE" == "msys" ]]; then
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
else
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
fi

cd ../..

echo "Ending setup bash job in 10 secs..."
sleep 10
