from abc import abstractmethod
from typing import List, Dict

import numpy as np


class AbstractProcessor:

    @abstractmethod
    def preprocess(self, model_input: np.ndarray) -> np.ndarray:
        pass

    @abstractmethod
    def postprocess(self, model_output: List[np.ndarray]) -> Dict:
        pass