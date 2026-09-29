import json
import os
import sys
from datetime import datetime, timezone

import mlflow
import dagshub
from sklearn.ensemble import (
    AdaBoostClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from networksecurity.entity.artifact_entity import (
    ClassificationMetricArtifact,
    DataTransformationArtifact,
    ModelTrainerArtifact,
)
from networksecurity.entity.config_entity import ModelTrainerConfig
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.utils.main_utils.utils import (
    load_numpy_array_data,
    load_object,
    save_object,
    evaluate_models,
)
from networksecurity.utils.ml_utils.model.estimator import NetworkModel

# dagshub.init(repo_owner="<your_username>", repo_name="<your_repo>", mlflow=True)
# mlflow.set_registry_uri("https://dagshub.com/<your_username>/<your_repo>.mlflow")


class ModelTrainer:
    def __init__(
        self,
        model_trainer_config: ModelTrainerConfig,
        data_transformation_artifact: DataTransformationArtifact,
    ):
        try:
            self.model_trainer_config = model_trainer_config
            self.data_transformation_artifact = data_transformation_artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def track_mlflow(self, model, classification_metric: ClassificationMetricArtifact, run_name: str):
        with mlflow.start_run(run_name=run_name):
            mlflow.log_metric("f1_score", classification_metric.f1_score)
            mlflow.log_metric("precision_score", classification_metric.precision_score)
            mlflow.log_metric("recall_score", classification_metric.recall_score)
            mlflow.sklearn.log_model(model, "model")

    def train_model(self, X_train, y_train, X_test, y_test) -> ModelTrainerArtifact:
        models = {
            "Random Forest": RandomForestClassifier(verbose=0),
            "Decision Tree": DecisionTreeClassifier(),
            "Gradient Boosting": GradientBoostingClassifier(verbose=0),
            "Logistic Regression": LogisticRegression(verbose=0),
            "AdaBoost": AdaBoostClassifier(),
            "XGBoost": XGBClassifier(eval_metric="logloss"),
        }
        params = {
            "Decision Tree": {"criterion": ["gini", "entropy", "log_loss"]},
            "Random Forest": {"n_estimators": [8, 16, 32, 128, 256]},
            "Gradient Boosting": {
                "learning_rate": [0.1, 0.01, 0.05, 0.001],
                "subsample": [0.6, 0.7, 0.75, 0.85, 0.9],
                "n_estimators": [8, 16, 32, 128, 256],
            },
            "Logistic Regression": {},
            "AdaBoost": {
                "learning_rate": [0.1, 0.01, 0.001],
                "n_estimators": [8, 16, 32, 64, 128, 256],
            },
            "XGBoost": {
                "learning_rate": [0.1, 0.01, 0.05],
                "n_estimators": [50, 100, 200],
                "max_depth": [3, 5, 7],
            },
        }

        model_report: dict = evaluate_models(
            X_train=X_train, y_train=y_train, X_test=X_test, y_test=y_test,
            models=models, param=params,
        )

        best_model_score = max(sorted(model_report.values()))
        best_model_name = list(model_report.keys())[
            list(model_report.values()).index(best_model_score)
        ]
        best_model = models[best_model_name]

        y_train_pred = best_model.predict(X_train)
        train_metric = ClassificationMetricArtifact(
            f1_score=f1_score(y_train, y_train_pred),
            precision_score=precision_score(y_train, y_train_pred),
            recall_score=recall_score(y_train, y_train_pred),
        )
        self.track_mlflow(best_model, train_metric, run_name=f"{best_model_name}-train")

        y_test_pred = best_model.predict(X_test)
        test_metric = ClassificationMetricArtifact(
            f1_score=f1_score(y_test, y_test_pred),
            precision_score=precision_score(y_test, y_test_pred),
            recall_score=recall_score(y_test, y_test_pred),
        )
        self.track_mlflow(best_model, test_metric, run_name=f"{best_model_name}-test")

        preprocessor = load_object(
            file_path=self.data_transformation_artifact.transformed_object_file_path
        )
        os.makedirs(
            os.path.dirname(self.model_trainer_config.trained_model_file_path),
            exist_ok=True,
        )
        network_model = NetworkModel(preprocessor=preprocessor, model=best_model)
        save_object(self.model_trainer_config.trained_model_file_path, network_model)
        save_object("final_model/model.pkl", best_model)
        save_object("final_model/preprocessor.pkl", preprocessor)

        # ── Persist metrics alongside the model so /model-info can read
        #    them without needing MLflow access at serving time. ──────────
        metrics_data = {
            "model_type": best_model_name,
            "f1_score": round(test_metric.f1_score, 6),
            "precision_score": round(test_metric.precision_score, 6),
            "recall_score": round(test_metric.recall_score, 6),
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }
        os.makedirs("final_model", exist_ok=True)
        with open("final_model/metrics.json", "w") as mf:
            json.dump(metrics_data, mf, indent=2)
        logger.info(f"Saved final_model/metrics.json: {metrics_data}")

        return ModelTrainerArtifact(
            trained_model_file_path=self.model_trainer_config.trained_model_file_path,
            train_metric_artifact=train_metric,
            test_metric_artifact=test_metric,
        )

    def initiate_model_trainer(self) -> ModelTrainerArtifact:
        try:
            train_arr = load_numpy_array_data(
                self.data_transformation_artifact.transformed_train_file_path
            )
            test_arr = load_numpy_array_data(
                self.data_transformation_artifact.transformed_test_file_path
            )

            X_train, y_train, X_test, y_test = (
                train_arr[:, :-1], train_arr[:, -1],
                test_arr[:, :-1], test_arr[:, -1],
            )
            return self.train_model(X_train, y_train, X_test, y_test)
        except Exception as e:
            raise NetworkSecurityException(e, sys)
