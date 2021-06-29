#! /bin/sh

cd ./src/engine
echo "Installing Python Environment for Portal..."
python3 -m pip install --upgrade pip
python3 -m pip install pipenv
PIPENV_VENV_IN_PROJECT=1 PIPENV_DEFAULT_PYTHON_VERSION=3.7 pipenv sync -d
cd ../app
echo "Installing Nextjs Environment for Portal..."
npm install
cd ../..
echo "Ending setup bash job in 10 secs..."
sleep 10
