#! /bin/bash

# exit when any command fails
set -e
# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "Exiting shell: \"${last_command}\" command failed with exit code $?."' EXIT

declare -a FILES_NEEDED=(./src/engine/run.py ./Pipfile ./Pipfile.lock)
missing_files="false"

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

echo "Copying related engine files to portal_build..."
cp -R ./src/engine/server ./portal_build
cp ./src/engine/run.py ./portal_build
cp ./Pipfile.lock ./portal_build
cp ./Pipfile ./portal_build

cd ./portal_build
echo "Installing Python Environment in portal_build..."
echo "$OSTYPE"
python3 -m pip install --upgrade pip
python3 -m pip install pipenv
PIPENV_VENV_IN_PROJECT=1 PIPENV_DEFAULT_PYTHON_VERSION=3.9 pipenv sync -d

cd ..

echo "Ending setup bash job in 10 secs..."
sleep 10
