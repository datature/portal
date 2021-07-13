<img src="./build/icon.png" width="128" height="128" />

# Portal

Portal is the fastest way to load and visualize your deep learning models.

> Load models from Datature Nexus or drop in `saved_model` files onto the platform + run inference to visualize the performance of the model - without a single line of code
> You may refer to the [documentation][docs] for further details of the application

[docs]: https://docs.datature.io/

## Setting up the environment

This framework is built using Python 3.7. There are 2 different options for you to setup the environment. You can either install the necessary packages globally or or install them into a newly created virtual environment.

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

Running the following command will open the portal application on the browser via http://localhost:5000.

> If you wish to run the application on electron, add the `--electron` flag.
> If you wish to run the application on gpu, add the `--gpu` flag.

```.bash
python3 portal-build/portal.py
```

## Sample Weights

We have provided sample weights for you to test portal:

| Dataset   | Description                                             |     Download Link      |
| --------- | ------------------------------------------------------- | :--------------------: |
| Yolo-v3   | DarkNet model obtained from [pjreddie/darknet][darknet] |      [Yolo][yolo]      |
| MobileNet | Tensorflow model                                        | [MobileNet][mobilenet] |

[darknet]: https://github.com/pjreddie/darknet
[yolo]: https://github.com/datature/portal/releases/download/v1.0/yolo.zip
[mobilenet]: https://github.com/datature/portal/releases/download/v1.0/mobilenet.zip
