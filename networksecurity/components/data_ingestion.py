import os
import sys
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from sklearn.model_selection import train_test_split
from dotenv import load_dotenv

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.entity.config_entity import DataIngestionConfig
from networksecurity.entity.artifact_entity import DataIngestionArtifact

load_dotenv()
POSTGRES_URL = os.getenv("POSTGRES_URL")


class DataIngestion:
    def __init__(self, data_ingestion_config: DataIngestionConfig):
        try:
            self.data_ingestion_config = data_ingestion_config
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def export_table_as_dataframe(self):
        """Pull raw records from the PostgreSQL table or fallback to local phisingData.csv."""
        try:
            table_name = self.data_ingestion_config.table_name
            if POSTGRES_URL:
                try:
                    logger.info(f"Connecting to PostgreSQL database to read table '{table_name}'")
                    engine = create_engine(POSTGRES_URL)
                    df = pd.read_sql(f"SELECT * FROM {table_name}", engine)
                    if "id" in df.columns.to_list():
                        df = df.drop(columns=["id"])
                    df.replace({"na": np.nan}, inplace=True)
                    logger.info(f"Loaded {len(df)} records from PostgreSQL table '{table_name}'")
                    return df
                except Exception as db_err:
                    logger.warning(f"Failed to read from PostgreSQL ({db_err}). Attempting fallback to local dataset file.")

            # Local CSV fallback
            local_csv_paths = ["phisingData.csv", os.path.join("data_schema", "phisingData.csv")]
            for csv_path in local_csv_paths:
                if os.path.exists(csv_path):
                    logger.info(f"Reading dataset from local file: {csv_path}")
                    df = pd.read_csv(csv_path)
                    if "id" in df.columns.to_list():
                        df = df.drop(columns=["id"])
                    df.replace({"na": np.nan}, inplace=True)
                    return df

            raise FileNotFoundError("Could not read from PostgreSQL and local 'phisingData.csv' not found.")
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def export_data_into_feature_store(self, dataframe: pd.DataFrame):
        try:
            feature_store_file_path = self.data_ingestion_config.feature_store_file_path
            dir_path = os.path.dirname(feature_store_file_path)
            os.makedirs(dir_path, exist_ok=True)
            dataframe.to_csv(feature_store_file_path, index=False, header=True)
            return dataframe
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def split_data_as_train_test(self, dataframe: pd.DataFrame):
        try:
            train_set, test_set = train_test_split(
                dataframe,
                test_size=self.data_ingestion_config.train_test_split_ratio,
            )
            logger.info("Performed train test split on the dataframe")

            dir_path = os.path.dirname(self.data_ingestion_config.training_file_path)
            os.makedirs(dir_path, exist_ok=True)

            train_set.to_csv(
                self.data_ingestion_config.training_file_path, index=False, header=True
            )
            test_set.to_csv(
                self.data_ingestion_config.testing_file_path, index=False, header=True
            )
            logger.info("Exported train and test file paths")
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def initiate_data_ingestion(self) -> DataIngestionArtifact:
        try:
            dataframe = self.export_table_as_dataframe()
            dataframe = self.export_data_into_feature_store(dataframe)
            self.split_data_as_train_test(dataframe)

            return DataIngestionArtifact(
                trained_file_path=self.data_ingestion_config.training_file_path,
                test_file_path=self.data_ingestion_config.testing_file_path,
            )
        except Exception as e:
            raise NetworkSecurityException(e, sys)
