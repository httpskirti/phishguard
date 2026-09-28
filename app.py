import os
import sys
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

from networksecurity.pipeline.predict_pipeline import PredictPipeline
from networksecurity.pipeline.training_pipeline import TrainingPipeline
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.constant.training_pipeline import TARGET_COLUMN

app = FastAPI(
    title="PhishGuard - Network Security Phishing Detection",
    description="MLOps API for Phishing Website Detection (FastAPI + Scikit-Learn)",
    version="1.0.0",
)


@app.get("/")
def index():
    return {
        "project": "PhishGuard",
        "description": "End-to-End MLOps Pipeline for Phishing Website Classification",
        "endpoints": {
            "GET /train": "Re-run the full training pipeline",
            "POST /predict": "Upload a CSV with 30 URL/page features to get phishing predictions",
            "GET /docs": "Interactive Swagger API documentation",
        },
    }


@app.get("/train")
def train_route():
    try:
        logger.info("Training pipeline triggered via GET /train")
        pipeline = TrainingPipeline()
        artifact = pipeline.run_pipeline()
        return {
            "status": "success",
            "message": "Training pipeline completed successfully",
            "trained_model_file_path": artifact.trained_model_file_path,
            "train_f1_score": artifact.train_metric_artifact.f1_score,
            "test_f1_score": artifact.test_metric_artifact.f1_score,
        }
    except Exception as e:
        logger.error(f"Training pipeline execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are supported for prediction.")

        logger.info(f"Received file for prediction: {file.filename}")
        df = pd.read_csv(file.file)

        predict_pipeline = PredictPipeline()
        predictions = predict_pipeline.predict(df)

        df["prediction"] = predictions
        df["prediction_label"] = df["prediction"].map({1: "legitimate", 0: "phishing"})

        return {
            "status": "success",
            "total_records": len(df),
            "predictions_summary": df["prediction_label"].value_counts().to_dict(),
            "predictions": df.to_dict(orient="records"),
        }
    except HTTPException:
        raise
    except FileNotFoundError as fnf:
        logger.error(f"Model artifacts missing: {fnf}")
        raise HTTPException(status_code=404, detail=str(fnf))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
