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

**This is the recommended way of running Portal**

Portal is built using `Python 3.7`. Ensure that you have this version and up before beginning (`Python 3.7 <= X < 3.9`). Clone the repository and then navigate to the directory where `requirements.txt` is and install all necessary dependencies and setup using `setup.sh`:

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

#### Keymaps and Shortcuts
To view the various key maps and shortcuts, press `?` on your keyboard whilst in Portal. There are various shortcuts such as showing labels of detections, going to the next photo, etc. If you have any suggestions or change recommendation, feel free to open a `Feature Request`

**Portal works on both Mask and Bounding Box models.** For detailed documentations about advanced features of Portal can be found here : <a href="https://docs.datature.io/portal/documentation">Portal Documentation</a>


## Working with Datature Nexus

Portal works seemlessly with [Nexus, our MLOps platform](https://datature.io), that helps developers and teams build computer vision models - it comes fully featured with an advanced annotator, augmentation studio, 30+ models and ability to train on multi-GPU settings. Anyhoo, here's how to build a model and run it in Portal - 

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/nexus-ss-4.png?raw=true" width="45%">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/nexus-ss-5.png?raw=true" width="45%">
</p>

<p>To build a model on Nexus, simply create a project, upload the dataset, annotate the images, and create a training pipeline. You should be able to start a model training and this can take a few hours. As the model training progress, checkpoints are automatically generated and you should see them in the Artifacts page. For more details on how to use Nexus, consider watching our tutorial <a href="https://www.youtube.com/watch?v=KA4RGtnabDk">here</a>.</p>

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/nexus-ss-1.png?raw=true" width="45%">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/nexus-ss-2.png?raw=true" width="45%">
</p>

<p>Once you are done with a training and a candidate checkpoint is selected, you can generate a TensorFlow model under the Artifacts page to obtain the model key required by Portal for the following setup. Use the register model interface to insert this key to the model under Datature Hub.</p>

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/screencaps/nexus-ss-3.png?raw=true" width="80%">
</p>

<p>With this, you can now run Analyze on your test images and you should be able to train and test new models between Nexus and Portal easily by repeating the steps above. If you'd like to give Datature Nexus a try, simply sign up for an account at https://datature.io - It comes with a free tier!</p>

<p align="center">
  <img alt="Image Prediction" src="https://github.com/datature/portal/blob/develop/docs/images/nexus-rb.gif?raw=true" width="80%">
</p>



## Screencasts
[Using Portal to Inspect Computer Vision Models](https://www.youtube.com/watch?v=dTaqVkr8re0)

[Building an Object Detection Model with Datature](https://www.youtube.com/watch?v=KA4RGtnabDk)

[Building an Instance Segmentation Model with Datature](https://www.youtube.com/watch?v=uLVWanPjGp0)

## Sample Weights

We have provided sample weights for you to test Portal:

| Dataset                          | Description                                           |     Download Link      |
| -------------------------------- | ----------------------------------------------------- | :--------------------: |
| YOLO-v3                          | DarkNet Model based off [pjreddie/darknet][darknet]   |     [YOLOv3][yolo]     |
| SSD MobileNet V2 FPNLite 640x640 | Tensorflow Model from [tensorflow/models][tensorflow] | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[tensorflow]: https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/tf2_detection_zoo.md
[yolo]: https://drive.google.com/file/d/12gtZdta0LhPn48s4LHqFKFahqcgAML9-/view?usp=sharing
[mobilenet]: http://download.tensorflow.org/models/object_detection/tf2/20200711/ssd_mobilenet_v2_fpnlite_640x640_coco17_tpu-8.tar.gz
