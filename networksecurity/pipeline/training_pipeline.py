import sys

from networksecurity.components.data_ingestion import DataIngestion
from networksecurity.components.data_validation import DataValidation
from networksecurity.components.data_transformation import DataTransformation
from networksecurity.components.model_trainer import ModelTrainer

from networksecurity.entity.config_entity import (
    TrainingPipelineConfig,
    DataIngestionConfig,
    DataValidationConfig,
    DataTransformationConfig,
    ModelTrainerConfig,
)
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger


class TrainingPipeline:
    def __init__(self):
        self.training_pipeline_config = TrainingPipelineConfig()

    def start_data_ingestion(self):
        try:
            data_ingestion_config = DataIngestionConfig(self.training_pipeline_config)
            logger.info("Starting data ingestion")
            data_ingestion = DataIngestion(data_ingestion_config)
            artifact = data_ingestion.initiate_data_ingestion()
            logger.info(f"Data ingestion completed: {artifact}")
            return artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def start_data_validation(self, data_ingestion_artifact):
        try:
            data_validation_config = DataValidationConfig(self.training_pipeline_config)
            data_validation = DataValidation(data_ingestion_artifact, data_validation_config)
            logger.info("Starting data validation")
            artifact = data_validation.initiate_data_validation()
            logger.info(f"Data validation completed: {artifact}")
            return artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def start_data_transformation(self, data_validation_artifact):
        try:
            data_transformation_config = DataTransformationConfig(
                self.training_pipeline_config
            )
            data_transformation = DataTransformation(
                data_validation_artifact, data_transformation_config
            )
            logger.info("Starting data transformation")
            artifact = data_transformation.initiate_data_transformation()
            logger.info(f"Data transformation completed: {artifact}")
            return artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def start_model_trainer(self, data_transformation_artifact):
        try:
            model_trainer_config = ModelTrainerConfig(self.training_pipeline_config)
            model_trainer = ModelTrainer(model_trainer_config, data_transformation_artifact)
            logger.info("Starting model training")
            artifact = model_trainer.initiate_model_trainer()
            logger.info(f"Model training completed: {artifact}")
            return artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def run_pipeline(self):
        try:
            data_ingestion_artifact = self.start_data_ingestion()
            data_validation_artifact = self.start_data_validation(data_ingestion_artifact)
            data_transformation_artifact = self.start_data_transformation(
                data_validation_artifact
            )
            model_trainer_artifact = self.start_model_trainer(data_transformation_artifact)
            return model_trainer_artifact
        except Exception as e:
            raise NetworkSecurityException(e, sys)
