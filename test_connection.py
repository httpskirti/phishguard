import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

pg_url = os.getenv("POSTGRES_URL")
if not pg_url:
    print("POSTGRES_URL is not set in .env")
    exit(1)

if pg_url.startswith("postgresql://"):
    pg_url = pg_url.replace("postgresql://", "postgresql+psycopg2://", 1)

try:
    engine = create_engine(pg_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        print("Connected successfully to PostgreSQL! Test query returned:", result)
        count = conn.execute(text("SELECT count(*) FROM network_data")).scalar()
        print(f"Table 'network_data' contains {count} records.")
except Exception as e:
    print("Database connection error:", e)