class AbstractModel:
    def __init__(self, directory: str, name: str, description: str):
        self._directory_ = directory
        self._name_ = name
        self._description_ = description
        self._key_ = None
        self._height_ = None
        self._width_ = None
        self._label_map_ = {}

    def get_info(self):
        return {
            "directory": self._directory_,
            "description": self._description_,
            "name": self._name_,
        }

    def get_key(self):
        return self._key_

    def get_label_map(self):
        return self._label_map_

    @classmethod
    def set_height_width(self):
        pass

    @classmethod
    def register(self):
        pass

    @classmethod
    def load(self):
        pass

    @classmethod
    def predict(self, model, image_array):
        pass
