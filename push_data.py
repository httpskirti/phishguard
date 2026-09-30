import os
import sys
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger

load_dotenv()
POSTGRES_URL = os.getenv("POSTGRES_URL")


def _normalize_postgres_url(url: str) -> str:
    if url and url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class NetworkDataExtract:
    """
    Extracts raw dataset from a local CSV and pushes it
    into the cloud PostgreSQL database table 'network_data'.
    """

    def __init__(self):
        try:
            if not POSTGRES_URL:
                raise ValueError("POSTGRES_URL is not set in the environment or .env file")
            self.engine = create_engine(_normalize_postgres_url(POSTGRES_URL))
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def csv_to_postgres(self, file_path: str, table_name: str = "network_data") -> int:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Input file not found at {file_path}")

            logger.info(f"Reading dataset from {file_path}")
            df = pd.read_csv(file_path)
            logger.info(f"Loaded DataFrame with shape: {df.shape}")

            logger.info(f"Pushing records to PostgreSQL table: {table_name}")
            df.to_sql(name=table_name, con=self.engine, if_exists="replace", index=False, chunksize=1000)
            logger.info(f"Successfully pushed {len(df)} records into '{table_name}' table")

            return len(df)
        except Exception as e:
            raise NetworkSecurityException(e, sys)


if __name__ == "__main__":
    try:
        # Default filename or path provided via CLI / default
        file_path = sys.argv[1] if len(sys.argv) > 1 else "phisingData.csv"
        extractor = NetworkDataExtract()
        records = extractor.csv_to_postgres(file_path=file_path)
        print(f"Pushed {records} records to PostgreSQL table 'network_data'.")
    except Exception as e:
        logger.error(str(e))
        print(f"Error pushing data: {e}")
