# Portal

[![Build Tests](https://github.com/datature/portal/actions/workflows/app-workflow.yml/badge.svg)](https://github.com/datature/portal/actions/workflows/app-workflow.yml)
[![Join Datature Slack](https://img.shields.io/badge/Join%20The%20Community-Datature%20Slack-blueviolet)](https://datature.io/community)

**Portal is the fastest way to load and visualize your deep learning models.** We are all sick of wrangling a bunch of `cv2` or `matplotlib` codes to test your models - especially on videos. We created portal to help teams, engineers, and product managers interactively test their model on images and videos, inference thresholds, IoU values and much more.

Portal is an open-source browser-based app written in `TypeScript`, `React` and `Flask`.

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

Portal can be used as a Web Application or through downloading and installing an Electron Application package via <a href="https://github.com/datature/portal/releases">Github Releases</a>. Procedures for both these methods are covered below. 

### Running Portal as Web Application

No installation required. Portal is built using `python 3.7`. Ensure that you have this version (and up) in order before beginning. There are 2 ways to go about this. Firstly, you could clone the repository and then navigate to the directory where `requirements.txt` is and install all necessary dependencies:

```.bash
git clone https://github.com/datature/portal
cd portal
pip install -r requirements.txt
./setup.sh
```

Running the following command will open the Portal application on the browser via http://localhost:9449.

> If you wish to run the application on gpu, add the `--gpu` flag.

```.bash
python3 portal.py
```


#### Using Virtual Environments

If you'd like to use virtual environments for this project - you can use a helpful script below to achieve this 

```
./setup-virtualenv.sh
```

### Running from Portal Executable

Portal comes with an installable version that essentiall runs on `electron.js` - this helps to provide a desktop application feel and ease of access of setting up. To install, please download the latest Portal release from <a href="https://github.com/datature/portal/releases">Github Releases</a> and run the Portal installer.

### Activate the virtual environment

If you have installed the packages in a virtual environment, you will need to activate it before running the application. This step is not necessary if you are running the application globally.

## Navigating Portal
On firing your Portal application or navigating to http://localhost:9449, you will be greeted with the following interface - The following steps details how you can load your YOLO or TensorFlow model on your image folders. To begin, let's assume we want to register a `tensorflow` model. Start by clicking on the `+` sign and adding the relevant paths

<p align="center">
  <img alt="Register Model" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-1.png?raw=true" width="90%">
</p>

Afterwards, load your model by clicking on the `Load Model..` button, highlighted in red then clicking on the corresponding model name. On the popover dialog bog, click on `I understand` to load your model: 

<p align="center">
  <img alt="Load Model" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-2.png?raw=true" width="90%">
</p>

It is time to load the necessary images to render your predictions. Click on the `Open Folders` button highlighted in pink (Or press `o` on your keyboard) and paste the folder path where your images are loaded. Once you are done, press the `enter` button. The images should appear in the region highlighted in white.

<p align="center">
  <img alt="Load Assets" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-3.png?raw=true" width="90%">
</p>

Lastly, load any of the images and click on the `Re-analyse` button highlighted in orange (Or press `r` on your keyboard) to render your predictions. We support both Mask and Rectangular bounding box predictions:

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-4.png?raw=true" width="90%">
</p>
<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-5.png?raw=true" width="90%">
</p>

More detailed documentation about advanced functions of Portal can be found in <a href="https://docs.datature.io/portal/documentation">docs.datature.io</a>.

## Sample Weights

We have provided sample weights for you to test portal:

| Dataset                          | Description                                                    |     Download Link      |
| -------------------------------- | -------------------------------------------------------------- | :--------------------: |
| YOLO-v3                          | DarkNet Model based off [pjreddie/darknet][darknet]        |      [YOLOv3][yolo]      |
| SSD MobileNet V2 FPNLite 640x640 | Tensorflow Model from [tensorflow/models][tensorflow] | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[tensorflow]: https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
[yolo]: https://drive.google.com/file/d/12gtZdta0LhPn48s4LHqFKFahqcgAML9-/view?usp=sharing
[mobilenet]: http://download.tensorflow.org/models/object_detection/tf2/20200711/ssd_mobilenet_v2_fpnlite_640x640_coco17_tpu-8.tar.gz
