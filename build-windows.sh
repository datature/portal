#! /bin/bash

chmod u+x setup-virtualenv.sh
./setup-virtualenv.sh

. ./portal_build/.venv/Scripts/activate

cd src/app/
nvm install 16 && nvm use 16
npm install --legacy-peer-deps
npm run build:static

cd ../engine/
pyinstaller \
    --collect-data ultralytics \
    --hidden-import pydicom.encoders.gdcm \
    --hidden-import pydicom.encoders.pylibjpeg \
    --hidden-import engineio.async_drivers.threading \
    -F run.py \
    --distpath ../../portal_build/dist

chmod u+x ../../portal_build/dist/run.exe

cd ../..
npm run dist
