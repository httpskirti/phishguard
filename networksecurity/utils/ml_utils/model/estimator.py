import sys
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger


class NetworkModel:
    """
    Bundles the fitted preprocessor + trained model into a single object,
    so serving code never has to worry about applying transforms in the
    right order — this is what gets pickled and loaded at inference time.
    """

    def __init__(self, preprocessor, model):
        try:
            self.preprocessor = preprocessor
            self.model = model
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def predict(self, x):
        try:
            x_transform = self.preprocessor.transform(x)
            return self.model.predict(x_transform)
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def predict_proba(self, x):
        try:
            x_transform = self.preprocessor.transform(x)
            if hasattr(self.model, "predict_proba"):
                return self.model.predict_proba(x_transform)
            raise AttributeError(f"{type(self.model).__name__} does not support predict_proba")
        except Exception as e:
            raise NetworkSecurityException(e, sys)
