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

## Setting up the environment

This framework is built using Python 3.7 and Node to run electron. There are 2 different options for you to setup the environment. You can either install the necessary packages globally or or install them into a newly created virtual environment.

- `./setup-virtualenv` bash file creates a new virtual environment for the packages. If you wish to install globally, run the following commands with `./setup.sh` instead.

Mac

```.bash
git clone https://github.com/datature/portal
chmod u+x ./setup-virtualenv.sh && ./setup-virtualenv.sh
```

Win

```.bash
git clone https://github.com/datature/portal
.\setup-virtualenv.sh
```

### Activate the virtual environment

If you have installed the packages in a virtual environment, you will need to activate it before running the application. This step is not necessary if you are running the application globally.

Mac

```.bash
. portal-build/.venv/bin/activate
```

Win

```.bash
portal-build\.venv\Scripts\activate
```

## Run the Portal app!

Running the following command will open the portal application on the browser via http://localhost:9449.

> If you wish to run the application on electron, add the `--electron` flag.
> If you wish to run the application on gpu, add the `--gpu` flag.

```.bash
python3 portal-build/portal.py
```

## Sample Weights

We have provided sample weights for you to test portal:

| Dataset                          | Description                                                    |     Download Link      |
| -------------------------------- | -------------------------------------------------------------- | :--------------------: |
| Yolo-v3                          | DarkNet model obtained from [pjreddie/darknet][darknet]        |      [Yolo][yolo]      |
| SSD MobileNet V2 FPNLite 640x640 | Tensorflow model obtained from [tensorflow/models][tensorflow] | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[tensorflow]: https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
[yolo]: https://github.com/datature/portal/releases/download/v1.0/yolo.zip
[mobilenet]: https://github.com/datature/portal/releases/download/v1.0/mobilenet.zip
