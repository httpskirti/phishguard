import sys
from networksecurity.pipeline.training_pipeline import TrainingPipeline
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger


def main():
    try:
        logger.info("Initializing TrainingPipeline execution")
        training_pipeline = TrainingPipeline()
        model_trainer_artifact = training_pipeline.run_pipeline()
        logger.info(f"TrainingPipeline completed successfully. Artifact: {model_trainer_artifact}")
        print("\n=== Training Completed Successfully ===")
        print(f"Trained Model Path: {model_trainer_artifact.trained_model_file_path}")
        print(f"Train F1 Score: {model_trainer_artifact.train_metric_artifact.f1_score:.4f}")
        print(f"Test F1 Score: {model_trainer_artifact.test_metric_artifact.f1_score:.4f}")
    except Exception as e:
        logger.error(f"Error during training pipeline execution: {e}")
        raise NetworkSecurityException(e, sys)


if __name__ == "__main__":
    main()
