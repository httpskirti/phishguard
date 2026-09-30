import os
import sys
import pandas as pd
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.utils.main_utils.utils import load_object
from networksecurity.utils.ml_utils.model.estimator import NetworkModel
from networksecurity.constant.training_pipeline import TARGET_COLUMN


class PredictPipeline:
    """
    Prediction pipeline that loads the saved preprocessor and model,
    cleans input features, and returns predictions.
    """

    def __init__(self, model_dir: str = "final_model"):
        try:
            self.model_path = os.path.join(model_dir, "model.pkl")
            self.preprocessor_path = os.path.join(model_dir, "preprocessor.pkl")
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def predict(self, dataframe: pd.DataFrame):
        try:
            if not os.path.exists(self.model_path) or not os.path.exists(self.preprocessor_path):
                raise FileNotFoundError(
                    f"Model artifacts missing in '{os.path.dirname(self.model_path)}'. Please run training first."
                )

            logger.info("Loading model and preprocessor for prediction")
            model = load_object(self.model_path)
            preprocessor = load_object(self.preprocessor_path)
            network_model = NetworkModel(preprocessor=preprocessor, model=model)

            df = dataframe.copy()
            if "id" in df.columns:
                df = df.drop(columns=["id"])
            if TARGET_COLUMN in df.columns:
                df = df.drop(columns=[TARGET_COLUMN])

            predictions = network_model.predict(df)
            logger.info(f"Generated {len(predictions)} predictions successfully")
            return predictions
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def predict_proba(self, dataframe: pd.DataFrame):
        try:
            if not os.path.exists(self.model_path) or not os.path.exists(self.preprocessor_path):
                raise FileNotFoundError(
                    f"Model artifacts missing in '{os.path.dirname(self.model_path)}'. Please run training first."
                )

            logger.info("Loading model and preprocessor for probability prediction")
            model = load_object(self.model_path)
            preprocessor = load_object(self.preprocessor_path)
            network_model = NetworkModel(preprocessor=preprocessor, model=model)

            df = dataframe.copy()
            if "id" in df.columns:
                df = df.drop(columns=["id"])
            if TARGET_COLUMN in df.columns:
                df = df.drop(columns=[TARGET_COLUMN])

            proba = network_model.predict_proba(df)
            logger.info("Generated probabilities successfully")
            return proba
        except Exception as e:
            raise NetworkSecurityException(e, sys)
