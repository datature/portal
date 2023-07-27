# Common Issues

## General

- **Portal directory not found**: Build/cache files are stored in the following directories based on your operating system:

  - **Windows EXE**:
    - Absolute path: `C:\Users\$USER\AppData\Local\Programs\Portal\resources\server`
    - Relative path: `resources\server`
  - **Linux Build (localhost)**:
    - Absolute path: `PATH/TO/portal/portal_build/server`
    - Relative path: `portal_build/server`
  - **Development Build**:
    - Absolute path: `PATH/TO/portal/server`
    - Relative path: `server`

## Windows Executable

- **No module named `{package}`**: You need to install the module. You can do this by running `pip install {package}` in the command line. If you are using a virtual environment, make sure you are in the correct environment. If you have already installed the module, make sure that you add this module as a `hidden-import` when you are building the executable using PyInstaller. You can do this by adding the `--hidden-import {package}` flag in `build-windows.sh`.

```bash
pyinstaller \
    -F run.py \
    --hidden-import {package} \
    --distpath ../../portal_build/dist
```

- **Invalid path/File not found error (`C:\Users\$USER\AppData\Local\Temp\_MEIXXXXX\{package}\{subpackage}\{file}`)**: You need to add the package as a `datas` parameter for PyInstaller. You can do this by adding the `--collect-data` flag in `build-windows.sh`.

```bash
pyinstaller \
    -F run.py \
    --collect-data {package} \
    --distpath ../../portal_build/dist
```
