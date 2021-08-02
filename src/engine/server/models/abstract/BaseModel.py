from server.services.errors import PortalError, Errors

"""Base model class that should be inherited by all other models."""


class BaseModel:
    def __init__(
        self,
        model_type: str,
        directory: str,
        name: str,
        description: str,
        height: int = None,
        width: int = None,
    ):
        self._type_ = model_type
        self._directory_ = directory
        self._name_ = name
        self._description_ = description
        self._key_ = None
        self._height_ = height
        self._width_ = width
        self._label_map_ = {}
        self._model_ = None

    def get_info(self):
        """Returns the name, type, directory and description of the model."""
        return {
            "directory": self._directory_,
            "description": self._description_,
            "name": self._name_,
            "type": self._type_,
        }

    def get_model(self):
        """Returns self._model_ if it is not None

        Throws PortalError Errors.NOTFOUND if model is not found.
        """
        if self._model_ is None:
            raise PortalError(Errors.NOTFOUND, "Model not found")
        return self._model_

    def get_key(self):
        """Returns the model key."""
        return self._key_

    def get_label_map(self):
        """Returns the label map of the model."""
        return self._label_map_

    @classmethod
    def _load_label_map_(self):
        """Function that should be overwritten by the child classes.

        All implementations of this function must do the following:
        1. Convert the label map into the following dictionary format:
            {
                '1':{
                        'id': 1,
                        'name': 'apple',
                    },
                '2':{
                        'id': 2,
                        'name': 'pear',
                    }
            }
        2. Save this dictionary into self._label_map_.
        """
        raise NotImplementedError(
            "Using the BaseModel implementation of _load_label_map_."
            "Please also implement this in your custom model class."
        )

    @classmethod
    def register(self):
        """Function that should be overwritten by the child classes.

        All implementations of this function must do the following:
        1. Check if all critical files needed for the loading and prediction
            are inside self._directory_.
        2. Set self._height_ and self._width_ to be used for predictions.
        3. Load the label map with the function _load_label_map_().
        4. Set self._key_ to be the hash of self._directory_ :
            from server.services.hashing import get_hash
            self._key_ = get_hash(self._directory_)
        5. return (self._key_, self) as a tuple.
        """
        raise NotImplementedError(
            "Using the BaseModel implementation of register."
            "Please also implement this in your custom model class."
        )

    @classmethod
    def load(self):
        """Function that should be overwritten by the child classes.

        All implementations of this function must do the following:
        1. Load the model into a variable.
        2. Return the variable.
            loaded_model = load_the_model(<model_path>)
            return loaded_model
        """
        raise NotImplementedError(
            "Using the BaseModel implementation of load."
            "Please also implement this in your custom model class."
        )

    @classmethod
    def predict(self, model, image_array):
        """Function that should be overwritten by the child classes.

        All implementations of this function must do the following:
        1. Using the given model and the image array, perform inference
            on the image array.
        2. Return the inference as a dictionary of:
            {
                "detection_masks": <squeezed numpy array of all masks,
                    or None if this is not a segmentation model>,
                "detection_boxes": <squeezed numpy array of all bounding
                    boxes, in the form (Ymin, Xmin, Ymax, Xmax)>,
                "detection_scores": <squeezed numpy array of all confidences>,
                "detection_classes": <squeezed numpy array of all labels>,
            }
        Implementations must be done in a try-catch block, with all exceptions
        being caught and re-raised as FAILEDPREDICTION.
        ** self._height_ and self._width_ can be used here for inputs of the
            model-accepted height and width. **
        """
        raise NotImplementedError(
            "Using the BaseModel implementation of predict."
            "Please also implement this in your custom model class."
        )
