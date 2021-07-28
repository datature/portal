# Portal

[![Build Tests](https://github.com/datature/portal/actions/workflows/app-workflow.yml/badge.svg)](https://github.com/datature/portal/actions/workflows/app-workflow.yml)
[![Join Datature Slack](https://img.shields.io/badge/Join%20The%20Community-Datature%20Slack-blueviolet)](https://datature.io/community)

**Portal is the fastest way to load and visualize your deep learning models.** We are all sick of wrangling a bunch of `cv2` or `matplotlib` codes to test your models - especially on videos. We created portal to help teams, engineers, and product managers interactively test their model on images and videos, inference thresholds, IoU values and much more.

Portal is an open-source browser-based app written in `TypeScript`, `React` and `Flask`.

Made with `♥` by [Datature](https://datature.io)

<br>
<p align="center">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-image.gif?raw=true" width="90%">
</p>

Portal works on both images and videos - bounding boxes and masks - allowing you to use it as a sandbox for testing your model's performance. Additionally, Portal supports Datature Hub, TensorFlow and DarkNet models (PyTorch Support Incoming) and runs on either our electron app or your browser.

<p align="center">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-video.gif?raw=true" width="45%">
  <img alt="Portal User Experience" src="https://github.com/datature/portal/blob/develop/docs/images/portal-demo-fields.gif?raw=true" width="45%">
</p>

## Setting up Portal

Portal can be used as a Web Application or through downloading and installing our Electron package via <a href="https://github.com/datature/portal/releases"> Portal Releases</a>.

### Running Portal as a Web Application

Portal is built using `python 3.7`. Ensure that you have this version (and up) before beginning. Clone the repository and then navigate to the directory where `requirements.txt` is and install all necessary dependencies and setup using `setup.sh`:

```.bash
git clone https://github.com/datature/portal
cd portal
pip3 install -r requirements.txt
./setup.sh
```

Running the following command will open the Portal application on the browser via http://localhost:9449.

> If you wish to run the application on gpu, add a trailing `--gpu` flag (This only works for TensorFlow Models)

```.bash
python3 portal.py
```

#### Using Virtual Environment

If you'd like to use virtual environments for this project - you can use a helpful script below to before activating the virtualenv -

```
./setup-virtualenv.sh
```

### Running from Portal Executable

Portal comes with an installable version that runs on `electron.js` - this helps to provide a desktop application feel and ease of access of setting up. To install, please download the latest <a href="https://github.com/datature/portal/releases">Portal Releases</a> and run the Portal installer for your OS.

## Navigating Portal

On starting Portal or navigating to http://localhost:9449 - The following steps details how you can load your YOLO or TensorFlow model on your image folders. To begin, let's assume we want to register a `tf2.0` model. On Portal, a concept we use is that you can register multiple models but load one at each time.

#### Registering and Loading Portal

Start by clicking on the `+` sign and adding the relevant filepaths, e.g. `/user/portal/downloads/MobileNet/` and a name. You will be prompted to load the model as seen below. Simply click on the model you'd like to load and the engine wil

<p align="center">
  <img alt="Register Model" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-1.png?raw=true" width="45%">
  <img alt="Load Model" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-2.png?raw=true" width="45%">
</p>

#### Loading Your Images / Videos

To load your dataset (images / videos), click on the `Open Folders` button in the menu and paste your folder path to your dataswr. Once you are done, press the `enter` button. The images should appear in the asset menu below. You can load and synchronize multiple folders at once on Portal.

<p align="center">
  <img alt="Load Assets" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-3.png?raw=true" width="90%">
</p>

#### Running Inferences

Click on any image or video, press `Analyze`, and Portal will make the inference and render the results. You can then adjust the confidence threshold or filter various classes as needed. Note that Portal run inferences on videos frame-by-frame, so that will take some time. You can change the inference settings, such as **IoU** or **Frame Settings** under `Advanced Settings`.

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-4.png?raw=true" width="45%">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/portal-ss-5.png?raw=true" width="45%">
</p>

**Portal works on both Mask and Bounding Box models.** For detailed documentations about advanced features of Portal can be found here : <a href="https://docs.datature.io/portal/documentation">Portal Documentation</a>

## Sample Weights

We have provided sample weights for you to test portal:

| Dataset                          | Description                                           |     Download Link      |
| -------------------------------- | ----------------------------------------------------- | :--------------------: |
| YOLO-v3                          | DarkNet Model based off [pjreddie/darknet][darknet]   |     [YOLOv3][yolo]     |
| SSD MobileNet V2 FPNLite 640x640 | Tensorflow Model from [tensorflow/models][tensorflow] | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[tensorflow]: https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
[yolo]: https://drive.google.com/file/d/12gtZdta0LhPn48s4LHqFKFahqcgAML9-/view?usp=sharing
[mobilenet]: http://download.tensorflow.org/models/object_detection/tf2/20200711/ssd_mobilenet_v2_fpnlite_640x640_coco17_tpu-8.tar.gz
