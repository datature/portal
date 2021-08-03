import requests
import hashlib

from server.services.errors import Errors, PortalError
from server.services.hashing import get_hash

from server.models.abstract.BaseModel import BaseModel


class EndpointModel(BaseModel):
    def register(self):
        model_key = self.kwargs["model_key"]
        project_secret = self.kwargs["project_secret"]
        try:
            print("This part is not implemented yet")
        except:
            raise PortalError(Errors.ENDPOINTFAILED, "Endpoint Failed")
        pre_hash = (
            self._type_
            + self._name_
            + self._description_
            + model_key
            + project_secret
        ).encode("utf-8")
        self._key_ = hashlib.md5(pre_hash).hexdigest()
        return self._key_, self

    def load(self):
        try:
            print("This part is not implemented yet")
        except:
            raise PortalError(Errors.ENDPOINTFAILED, "Endpoint Failed")

    def predict(self):
        raise NotImplementedError("Predict Route Not Implemented Yet")
