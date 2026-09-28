import os
import sys
import glob
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from networksecurity.constant.training_pipeline import TARGET_COLUMN
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.utils.main_utils.utils import load_object
from networksecurity.utils.ml_utils.model.estimator import NetworkModel


def get_latest_validated_test_file() -> str:
    """Finds the newest validated test.csv across timestamped Artifact folders."""
    test_files = glob.glob(os.path.join("Artifacts", "*", "data_validation", "validated", "test.csv"))
    if not test_files:
        raise FileNotFoundError("No validated test.csv found in Artifacts. Please run the training pipeline first.")
    # Sort by folder creation / modification time to pick the newest
    latest_file = max(test_files, key=os.path.getmtime)
    return latest_file


def evaluate_saved_model():
    try:
        test_file_path = get_latest_validated_test_file()
        logger.info(f"Using latest test file: {test_file_path}")
        df = pd.read_csv(test_file_path)

        if TARGET_COLUMN not in df.columns:
            raise KeyError(f"Target column '{TARGET_COLUMN}' not present in test data")

        # Separate features and target
        X_test = df.drop(columns=[TARGET_COLUMN], axis=1)
        y_test = df[TARGET_COLUMN].replace(-1, 0)

        # Load saved model artifacts
        model_path = os.path.join("final_model", "model.pkl")
        preprocessor_path = os.path.join("final_model", "preprocessor.pkl")

        if not os.path.exists(model_path) or not os.path.exists(preprocessor_path):
            raise FileNotFoundError("Model or preprocessor missing in 'final_model/' directory.")

        model = load_object(model_path)
        preprocessor = load_object(preprocessor_path)
        network_model = NetworkModel(preprocessor=preprocessor, model=model)

        # Predict
        y_pred = network_model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)

        print("\n================ Model Evaluation Results ================")
        print(f"Test File Evaluated: {test_file_path}")
        print(f"Accuracy  : {acc:.4f}")
        print(f"F1 Score  : {f1:.4f}")
        print(f"Precision : {precision:.4f}")
        print(f"Recall    : {recall:.4f}")
        print("==========================================================\n")

        print("10 Sample Predictions (Actual vs Predicted):")
        sample_results = pd.DataFrame({
            "Actual": y_test.iloc[:10].values,
            "Predicted": y_pred[:10],
            "Match": (y_test.iloc[:10].values == y_pred[:10])
        })
        print(sample_results.to_string(index=False))

    except Exception as e:
        logger.error(f"Error testing model: {e}")
        raise NetworkSecurityException(e, sys)


if __name__ == "__main__":
    evaluate_saved_model()
