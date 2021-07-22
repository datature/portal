# Portal

[![Build Tests](https://github.com/datature/portal/actions/workflows/app-workflow.yml/badge.svg)](https://github.com/datature/portal/actions/workflows/app-workflow.yml)
[![Join Datature Slack](https://img.shields.io/badge/Join%20The%20Community-Datature%20Slack-blueviolet)](https://datature.io/community)

**Portal is the fastest way to load and visualize your deep learning models.** We are all sick of wrangling a bunch of `cv2` or `matplotlib` codes to test your models - especially on videos. We created portal to help teams, engineers, and product managers interactively test their model on images and videos, inference thresholds, IoU values and much more.

Portal is an open-source Electron / Browser based app written in TypeScript, React and Python Flask.

Made with `<3` by [Datature](https://datature.io)

<p align="center">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-image.gif?raw=true" width="90%">
</p>

Portal works on both images and videos - allowing you to use it as a sandbox for testing your model's performance. Additionally, Portal supports Datature Hub, TensorFlow and DarkNet models (PyTorch Support Incoming) and runs on either our electron app or your browser.

<p align="center">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-video.gif?raw=true" width="45%">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-fields.gif?raw=true" width="45%">
</p>

## Setting up Portal

You can either setup Portal as a Web Application or through downloading and installing a release package using <a href="https://github.com/datature/portal/releases">Github Releases</a>. Procedures for both these methods are covered below. 

## Setup as Web Application

The Web application is built using `python 3.7` and `Node.js v14`. Ensure that you have these versions in order before beginning the installation process. There are 2 ways to go about this. Firstly, you could clone the repository and then navigate to the directory where `requirements.txt` is and install all necessary dependencies:

```.bash
git clone https://github.com/datature/portal
cd portal/src/engine
pip install -r requirements.txt
```

Alternatively, you could clone the repository and immediately run `./setup.sh` which is the bash script that installs the necessary dependencies for you:

```.bash
git clone https://github.com/datature/portal
cd portal
./setup.sh
```

### Virtual Environment Setup

This section is for those who would like to install their packages in a virtual environment. For those using `requirements.txt`, after performing `cd portal/src/engine`, run these lines first and continue your installation as per normal.

```
pip install virtualenv
virtualenv .venv
.venv/Scripts/Activate
```

For those installing Portal using `bash`, run this script instead:

```
./setup-virtualenv.sh
```

## Setup from source

This version of Portal comes bundled with `electron.js` for users who prefer a native desktop feel.

For those that would like to run from source, please download the latest Portal release from <a href="https://github.com/datature/portal/releases">Github Releases</a> and run the Portal installer.

### Activate the virtual environment

If you have installed the packages in a virtual environment, you will need to activate it before running the application. This step is not necessary if you are running the application globally.

Mac / Unix

```.bash
. portal_build/.venv/bin/activate
```

Win

```.bash
portal_build\.venv\Scripts\activate
```

## Run the Portal app!

Running the following command will open the Portal application on the browser via http://localhost:9449.

> If you wish to run the application on electron, add the `--electron` flag.
> If you wish to run the application on gpu, add the `--gpu` flag.

```.bash
python3 portal.py
```

If you're running Portal from source, simply run the executable file after installation. You should see this:

<p align="center">
  <img alt="Portal Landing Screen" src="https://github.com/datature/portal/blob/develop/docs/images/landing.png?raw=true" width="90%">
</p>

To begin, register a `tensorflow` model by clicking on the `+` sign which is highlighted in green. Give it a name and indicate the full folder part where the model is located:

<p align="center">
  <img alt="Register Model" src="https://github.com/datature/portal/blob/develop/docs/images/register-model.png?raw=true" width="90%">
</p>

Afterwards, load your model by clicking on the `Load Model..` button, highlighted in red then clicking on the corresponding model name. On the popover dialog bog, click on `I understand` to load your model: 

<p align="center">
  <img alt="Load Model" src="https://github.com/datature/portal/blob/develop/docs/images/load-model.png?raw=true" width="90%">
</p>

It is time to load the necessary images to render your predictions. Click on the `Open Folders` button highlighted in pink (Or press `o` on your keyboard) and paste the folder path where your images are loaded. Once you are done, press the `enter` button. The images should appear in the region highlighted in white.

<p align="center">
  <img alt="Load Assets" src="https://github.com/datature/portal/blob/develop/docs/images/load-asset.png?raw=true" width="90%">
</p>

Lastly, load any of the images and click on the `Re-analyse` button highlighted in orange (Or press `r` on your keyboard) to render your predictions:

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/render-predict.png?raw=true" width="90%">
</p>

More detailed documentation about advanced functions of Portal can be found in <a href="https://docs.datature.io/portal/documentation">docs.datature.io</a>

## Sample Weights

We have provided sample weights for you to test portal:

| Dataset                          | Description                                                    |     Download Link      |
| -------------------------------- | -------------------------------------------------------------- | :--------------------: |
| Yolo-v3                          | DarkNet model obtained from [pjreddie/darknet][darknet]        |      [Yolo][yolo]      |
| SSD MobileNet V2 FPNLite 640x640 | Tensorflow model obtained from [tensorflow/models][tensorflow] | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[tensorflow]: https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
[yolo]: https://github.com/datature/portal/releases/download/release-0.4.0/yolo.zip
[mobilenet]: https://github.com/datature/portal/releases/download/release-0.4.0/mobilenet.zip
