# Contributing to Portal

👋 Hi Developers! Thank you so much for contributing to Portal!

This file serves as a guide for you to contribute your ideas onto the Portal platform.

## Table of Contents

[What are the Components of Portal?](#components)

[How do I Get Started on Contributing?](#contributing)

[How do I Handle Errors while Contributing?](#errors)

## What are the Components of Portal? <a name="components"></a>

The two main components of portal is the **App** and the **Engine**.

The **App** serves as a graphical user interface for users to interact with.
Events triggerred in **App** may update **App** itself and/or trigger API calls to the **Engine**.

The **Engine** performs the more complicated computations. The **Engine** receives a specific API call from the **App**, and performs the function corresponding to the API call, before responding to **App**.

## How do I Get Started on Contributing? <a name="contributing"></a>

To begin contributing to Portal, first fork the repository, make your changes, then submit a pull request into the Portal's `develop` branch.

Here are some suggestions for you to begin contributing to Portal. However, you may contribute to portal in any way, so do not be restricted by this list!

### <ins>Contributing to Engine</ins>

**Custom Model Class Creation**

In the current release of Portal, TensorFlow and Darknet models are supported. So what if you have another model that is built from a different machine learning library? In this case you might have to consider creating a custom model class.

The **Engine** is compatible with any type of model provided that they inherit from the [BaseModel](../src/engine/server/models/abstract/BaseModel.py) class architecture.

The steps to creating a custom model can be done in a several steps:

1.  From `src/engine/server/models`, create your own custom model module (such as example_model.py)
2.  Import the following modules:
    ```python
    from server.services.errors import Errors, PortalError
    from server.services.hashing import get_hash
    from server.models.abstract.BaseModel import BaseModel
    ```
3.  Create your own custom model class (such as ExampleModel), which inherits from BaseModel

    ```python
    class ExampleModel(BaseModel):{

    }
    ```

4.  Within your custom model class, define the following functions:

    - `_load_label_map_(self)`
      - Converts your label map into the following dictionary format and then saves it into `self._label_map_`:
        ```python
        self._label_map_ = {
            '1':{
                    'id': 1,
                    'name': 'apple',
                },
            '2':{
                    'id': 2,
                    'name': 'pear',
                }
        }
        ```
    - `register(self)`
      - Checks if all critical files needed for loading and prediction are inside `self._directory_`
      - Set the height (`self._height_`) and width (`self._width_`) of the image that the model should receive.
      - Load the label map with the function `_load_label_map_()`
      - Set the model key (`self._key_`) to be the hash of the model directory (`self._directory_`) with the function:
        ```python
        from server.services.hashing import get_hash
        self._key_ = get_hash(self._directory_)
        ```
      - return (`self._key_`, self) as a tuple.
    - `load(self)`
      - Load the model into a variable and return that variable
        ```python
        loaded_model = load_the_model(<model_path>)
        return loaded_model
        ```
    - `predict(self, model, image_array)`

      - Take in the model and perform inference on the image array.
      - Return the inference as a dictionary of

        ```python
        {
            "detection_masks":  <ndarray of shape [Instances, Height, Width]
                                representing the prediction masks,
                                or None if this is not a segmentation model>,

            "detection_boxes":  <ndarray of shape [Instances, 4]
                                representing the bounding boxes,
                                in the form (Ymin, Xmin, Ymax, Xmax)>,

            "detection_scores": <ndarray of shape [Instances, 1]
                                representing the confidence>,

            "detection_classes": <ndarray of shape [Instances, 1],
                                representing label ids>,
        }
        ```

    You may also define other functions, but these functions are the basic necessity.

5.  In the [Model Factory](../src/engine/server/models/abstract/Model.py) `src/engine/server/models/abstract/Model.py`, import and add your your custom model class into the `model_class` dictionary.

    ```python
    from server.models.example_model import ExampleModel

    # Inside Model function:
    model_class = {
        "tensorflow": TensorflowModel,
        "darknet": DarknetModel,
        "example": ExampleModel, # <<--------- add here
    }
    ```

The **Engine** is now configured to accept a new type of model. Next, we configure the **App**.

6.  In the [model](../src/app/src/components/annotations/model.tsx) file `src/app/src/components/annotations/model.tsx`:
    - In `FormData -> modelType` add your custom model string
      ```ts
      export type FormData = {
        type: string;
        name: string;
        description: string;
        directory: string;
        modelKey: string;
        projectSecret: string;
        modelType: "tensorflow" | "darknet" | "example" | ""; //<----Add here
      };
      ```
    * In `Model -> render() -> modelTypes`, add your custom model
      ```ts
      const modelTypes = {
        tensorflow: "TensorFlow 2.0",
        darknet: "DarkNet (YOLO v3, YOLO v4)",
        example: "Example Model", //<-------------Add here
      };
      ```
    * In `Model -> render() -> registerModelForm`, add a new `Menu.Item` in the `Menu` component
      ```typescript
      <Menu>
        <Menu.Item
            shouldDismissPopover={false}
            text={modelTypes.tensorflow}
            onClick={() => {
            const event = {
                target: { name: "modelType", value: "tensorflow" },
            };
            this.handleChangeForm(event);
            }}
        />
        <Menu.Item
            shouldDismissPopover={false}
            text={modelTypes.darknet}
            onClick={() => {
            const event = {
                target: { name: "modelType", value: "darknet" },
            };
            this.handleChangeForm(event);
            }}
        />
        </Menu>
        //----------------Add below----------------------//
        <Menu.Item
          shouldDismissPopover={false}
          text={modelTypes.example}
          onClick={() => {
            const event = { target: { name: "modelType", value: "example" } };
            this.handleChangeForm(event);
          }}
        />
      </Menu>
      ```

Now restart Portal and you should be able to see the changes!

## How do I Handle Errors while Contributing? <a name="errors"></a>

**Portal Error Codes**

In Portal **Engine**, all errors are raised as a customised `PortalError`, which are readable and displayed by **App**. `PortalError` have different types, all of which can be found in [src/engine.server/services/errors.py](../src/engine/server/services/errors.py).

While contributing, whenever you need to raise an error, you can do so using this method:

```python
from server.services.errors import Errors, PortalError

raise PortalError(Errors.YOURERROR, "Your error string")
```

Should there be a scenario whereby an error that you wish to raise does not fall in the category of any of the primary errors provided by Portal, you may add your own PortalError type here in the Errors class of [src/engine.server/services/errors.py](../src/engine/server/services/errors.py).

```python
class Errors(Enum):
    # insert in this class
    YOURERROR = XXXX, YYY
    # where integer XXXX will be your custom error code
    # and integer YYY will be its HTTP return status.
```

_Note that all exceptions raised that are not_ `PortalError` _will be automatically converted to_ `PortalError` _with error type_ `UNKNOWN` _and error string transferred from the original exception._

**Debug Mode**

As `PortalError` will not cause **Engine** to exit, the error message will only be shown in **App**, but not in the terminal where **Engine** is running in.

To be able to display the traceback of **Engine**, you can enable `debug mode` by setting the environment variable `PORTAL_LOGGING` before starting engine:

<ins>Unix/Mac</ins>

```bash
$ export PORTAL_LOGGING=1
```

<ins>Windows</ins>

```bash
> set PORTAL_LOGGING=1
```

`PORTAL_LOGGING` accepts the values 1 to 5 inclusive, with the values signifying:

| Value | Threshold |
| :---: | :-------: |
|   1   |   Debug   |
|   2   |   Info    |
|   3   |  Warning  |
|   4   |   Error   |
|   5   | Critical  |
