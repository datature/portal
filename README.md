<img src="./build/icon.png" width="128" height="128" />

# Portal

Portal is the fastest way to load and visualize your deep learning models.

> Load models from Datature Nexus or drop in `saved_model` files onto the platform + run inference to visualize the performance of the model - without a single line of code

## Setting up the environment

This framework is built using Python 3.7. There are 2 different options for you to setup the environment:

- Replace `./setup-virtualenv` with `./setup.sh` if you wish to install the environment globally

```.bash
git clone https://github.com/datature/portal
chmod u+x ./setup-virtualenv.sh && ./setup-virtualenv.sh
```

### Activate the virtual environment

- If you are running the application globally, you do not need to activate the virtual environment

Mac

```.bash
. portal-build/.venv/bin/activate
```

Win

```.bash
portal-build\.venv\Scripts\activate
```

## Run the Portal app!

- Running the following command will run the portal application on the browser via http://localhost:5000.
  > If you wish to run the application on electron, add the `--electron` flag.
  > If you wish to run the application on gpu, add the `--gpu` flag.

```.bash
python3 portal-build/portal.py
```

# Sample Weights

We have provided sample weights for you to test portal:

| Dataset   | Description      |     Download Link      |
| --------- | ---------------- | :--------------------: |
| Yolo      | DarkNet model    |      [Yolo][yolo]      |
| MobileNet | Tensorflow model | [MobileNet][mobilenet] |

[yolo]: https://github.com/datature/portal/releases/download/v1.0/yolo.zip
[mobilenet]: https://github.com/datature/portal/releases/download/v1.0/mobilenet.zip
