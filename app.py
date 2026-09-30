"""
PhishGuard FastAPI Backend
==========================
Endpoints:
  GET  /               – health check
  GET  /train          – re-run full training pipeline  (admin, X-Admin-Key)
  GET  /model-info     – current model metadata/metrics (admin, X-Admin-Key)
  POST /predict        – (legacy) batch CSV prediction
  POST /predict-url    – scan a single URL, returns verdict + 30 features
  POST /predict-image  – scan a screenshot via OCR, returns same schema
"""
import json
import os
import re
import sys
import io
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pandas as pd
import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
import uvicorn

from networksecurity.pipeline.predict_pipeline import PredictPipeline
from networksecurity.pipeline.training_pipeline import TrainingPipeline
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logger
from networksecurity.constant.training_pipeline import TARGET_COLUMN
from networksecurity.utils.feature_extraction import extract_features, FEATURE_COLUMNS

# ──────────────────────────────────────────────────────────────────────────────
# Load environment variables from .env
# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()

# ──────────────────────────────────────────────────────────────────────────────
# Try importing optional OCR library (pytesseract).
# If it is not installed the /predict-image endpoint will return a graceful 503.
# ──────────────────────────────────────────────────────────────────────────────
try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PhishGuard – Network Security Phishing Detection",
    description="MLOps API for Phishing Website Detection (FastAPI + Scikit-Learn)",
    version="2.0.0",
)

# CORS – allow the Vite dev server (port 5173) and any localhost origin.
# In production restrict this list to your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Admin auth dependency
# ──────────────────────────────────────────────────────────────────────────────
#
# ⚠️  STUDENT-PROJECT-LEVEL AUTH — NOT PRODUCTION-GRADE  ⚠️
#
# This is a simple shared-secret API key checked via the X-Admin-Key header.
# For a real production system you would use:
#   • OAuth2 / OpenID Connect with a proper identity provider
#   • JWT tokens with expiry and refresh
#   • Session-based auth with CSRF protection
#
# We use this because the spec calls for "a student-project-level guard".
# ──────────────────────────────────────────────────────────────────────────────

ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "changeme")


async def require_admin_key(x_admin_key: str = Header(...)):
    """
    Validate the X-Admin-Key header against the ADMIN_API_KEY env var.

    Why a dependency?
        FastAPI's Depends() system lets us inject this check into any
        route simply by adding  dependencies=[Depends(require_admin_key)].
        If the key is wrong we raise 401 *before* the route body runs,
        so no expensive work is done for unauthorised callers.
    """
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin API key. Check your X-Admin-Key header.",
        )


# ──────────────────────────────────────────────────────────────────────────────
# Shared prediction pipeline (loaded once, reused across requests)
# ──────────────────────────────────────────────────────────────────────────────
_pipeline: Optional[PredictPipeline] = None

def get_pipeline() -> PredictPipeline:
    """Lazy-load the prediction pipeline so the server starts even if no model
    artefacts exist yet (users can call GET /train first)."""
    global _pipeline
    if _pipeline is None:
        _pipeline = PredictPipeline()
    return _pipeline


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────────────────────────────────────

class UrlRequest(BaseModel):
    """POST /predict-url request body."""
    url: str

    @field_validator("url")
    @classmethod
    def must_look_like_url(cls, v: str) -> str:
        v = v.strip()
        # Auto-prefix https:// if the user omitted the scheme
        if not re.match(r"^https?://", v, re.IGNORECASE):
            v = f"https://{v}"
        if not re.match(r"^https?://[^\s/$.?#].[^\s]*$", v, re.IGNORECASE):
            raise ValueError("Not a valid HTTP/HTTPS URL")
        return v


class ScanResponse(BaseModel):
    """Unified response for /predict-url and /predict-image."""
    url: str
    verdict: str                           # "Phishing" | "Legitimate"
    risk_score: float                      # 0.0 – 1.0 probability of phishing
    features: Dict[str, Any]              # 30 raw heuristic values (-1, 0, 1)
    unchecked_features: List[str]         # features that could not be fetched
    warnings: List[str]                   # human-readable risk reasons
    # Image-scan extras (omitted for URL scans)
    extracted_url: Optional[str] = None
    extraction_confidence: Optional[float] = None


class ModelInfoResponse(BaseModel):
    """GET /model-info response body."""
    trained: bool
    model_type: Optional[str] = None
    last_trained: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    mlflow_tracking_url: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Feature / model helpers
# ──────────────────────────────────────────────────────────────────────────────

def features_to_dataframe(features: Dict[str, int]) -> pd.DataFrame:
    """Pack the feature dict into the exact column-ordered DataFrame the model
    was trained on, so scikit-learn does not throw a feature-name mismatch."""
    row = {col: features.get(col, 0) for col in FEATURE_COLUMNS}
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def run_model(url: str, features: Dict[str, int]) -> tuple[str, float]:
    """
    Run the trained model on the feature vector.

    Returns:
        verdict    – "Phishing" or "Legitimate"
        risk_score – probability of phishing (0.0 – 1.0)

    Falls back to a heuristic rule if the model artefacts are missing.
    """
    try:
        pipeline = get_pipeline()
        df = features_to_dataframe(features)
        predictions = pipeline.predict(df)
        raw = int(predictions[0])   # 0 = phishing, 1 = legitimate (UCI convention)

        # Try to get probability from the model
        risk_score: float
        try:
            proba = pipeline.predict_proba(df)
            # proba shape: (1, 2) → column 0 = phishing probability (class 0 is phishing)
            risk_score = float(proba[0][0])
        except Exception as exc:
            logger.warning(f"predict_proba unavailable ({exc}); deriving risk score from features")
            phishing_signals = sum(1 for v in features.values() if v == -1)
            suspicious_signals = sum(1 for v in features.values() if v == 0)
            signal_ratio = (phishing_signals + 0.5 * suspicious_signals) / len(FEATURE_COLUMNS)
            if raw == 0:
                risk_score = max(0.55, min(0.98, 0.5 + signal_ratio))
            else:
                risk_score = min(0.45, max(0.02, signal_ratio))

        verdict = "Phishing" if (risk_score >= 0.5 or raw == 0) else "Legitimate"
        return verdict, risk_score

    except FileNotFoundError:
        # Model not trained yet → heuristic fallback
        logger.warning("Model artefacts not found; using heuristic fallback.")
        phishing_signals = sum(1 for v in features.values() if v == -1)
        suspicious_signals = sum(1 for v in features.values() if v == 0)
        risk = min(0.99, max(0.01, (phishing_signals + 0.5 * suspicious_signals) / len(FEATURE_COLUMNS)))
        verdict = "Phishing" if risk >= 0.5 else "Legitimate"
        return verdict, round(risk, 4)


# ──────────────────────────────────────────────────────────────────────────────
# GET / — health check
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    """
    Health check endpoint.
    The frontend polls this on load and every 30 s to drive the online/offline dot.
    """
    return {
        "project": "PhishGuard",
        "status": "online",
        "version": "2.0.0",
        "description": "End-to-End MLOps Pipeline for Phishing Website Classification",
        "endpoints": {
            "GET  /train":          "Re-run the full training pipeline (admin)",
            "GET  /model-info":     "Current model metadata (admin)",
            "POST /predict-url":    "Scan a single URL → verdict + 30 features",
            "POST /predict-image":  "Scan a screenshot via OCR → same schema",
            "POST /predict":        "(Legacy) Upload a CSV for batch prediction",
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET /train — trigger retraining  (ADMIN ONLY)
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/train", dependencies=[Depends(require_admin_key)])
def train_route():
    """Trigger the full training pipeline. Can take several minutes.
    Protected by X-Admin-Key header."""
    try:
        logger.info("Training pipeline triggered via GET /train")
        pipeline = TrainingPipeline()
        artifact = pipeline.run_pipeline()
        # Invalidate the cached predict pipeline so the new model is loaded
        global _pipeline
        _pipeline = None
        return {
            "status": "success",
            "message": "Training pipeline completed successfully.",
            "trained_model_file_path": artifact.trained_model_file_path,
            "train_f1_score": artifact.train_metric_artifact.f1_score,
            "test_f1_score":  artifact.test_metric_artifact.f1_score,
        }
    except Exception as e:
        logger.error(f"Training pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# GET /model-info — model metadata  (ADMIN ONLY)
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/model-info", response_model=ModelInfoResponse,
         dependencies=[Depends(require_admin_key)])
def model_info_route():
    """
    Return metadata about the currently deployed model:
    • model type (e.g. "XGBoost")
    • last trained timestamp
    • f1 / precision / recall from the training run

    This reads from final_model/metrics.json which is written by
    model_trainer.py at the end of every training run.

    WHY NOT READ FROM MLFLOW?
        MLflow is hosted on Dagshub and may be slow or unreachable.
        We persist a small JSON file locally so this endpoint is fast
        and always available.  The admin can click through to the
        Dagshub dashboard for full run history.
    """
    model_path = os.path.join("final_model", "model.pkl")
    metrics_path = os.path.join("final_model", "metrics.json")

    if not os.path.exists(model_path):
        return ModelInfoResponse(trained=False)

    # Last modified time of the model file as a fallback trained timestamp
    model_mtime = datetime.fromtimestamp(
        os.path.getmtime(model_path), tz=timezone.utc
    ).isoformat()

    # Read metrics.json (written by model_trainer.py)
    model_type = None
    last_trained = model_mtime
    metrics = None
    mlflow_url = None

    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                data = json.load(f)
            model_type = data.get("model_type")
            last_trained = data.get("trained_at", model_mtime)
            metrics = {
                "f1_score": data.get("f1_score"),
                "precision_score": data.get("precision_score"),
                "recall_score": data.get("recall_score"),
            }
        except Exception as exc:
            logger.warning(f"Could not read metrics.json: {exc}")

    # Try to read MLflow tracking URL from env
    mlflow_url = os.getenv("MLFLOW_TRACKING_URI")

    return ModelInfoResponse(
        trained=True,
        model_type=model_type,
        last_trained=last_trained,
        metrics=metrics,
        mlflow_tracking_url=mlflow_url,
    )


# ──────────────────────────────────────────────────────────────────────────────
# POST /predict-url — single-URL scan
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/predict-url", response_model=ScanResponse)
async def predict_url_route(body: UrlRequest):
    """
    Accept a URL string, extract 30 heuristic features, run the ML model,
    and return the verdict with per-feature details.

    Request JSON:  {"url": "https://example.com/login"}
    Response JSON: ScanResponse schema (see above)

    Error handling:
    • ValueError  (SSRF blocked IP)     → HTTP 422
    • ConnectionError (unreachable site) → HTTP 422
    • Other exceptions                   → HTTP 500
    """
    url = body.url
    logger.info(f"POST /predict-url  url={url}")

    try:
        # ── Extract features using the new module ──────────────────────
        result = extract_features(url)
        features = result["features"]
        unchecked = result["unchecked_features"]
        warnings = result["warnings"]

        # ── Run the ML model ───────────────────────────────────────────
        verdict, risk_score = run_model(url, features)

        return ScanResponse(
            url=url,
            verdict=verdict,
            risk_score=round(risk_score, 4),
            features=features,
            unchecked_features=unchecked,
            warnings=warnings,
        )

    except ValueError as exc:
        # SSRF protection triggered — URL resolves to a private IP
        logger.warning(f"SSRF blocked for {url}: {exc}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not reach the site: {exc}",
        )

    except ConnectionError as exc:
        # Site is completely unreachable
        logger.warning(f"Unreachable site {url}: {exc}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not reach the site: {exc}",
        )

    except HTTPException:
        raise

    except Exception as exc:
        logger.error(f"predict_url failed for {url}: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal scan error: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# POST /predict-image — screenshot OCR scan
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/predict-image", response_model=ScanResponse)
async def predict_image_route(file: UploadFile = File(...)):
    """
    Accept a PNG or JPG screenshot, run Tesseract OCR to extract the URL
    from the browser address bar, then run the same feature extraction + model.

    The frontend expects:
    - HTTP 200 with ScanResponse + extracted_url + extraction_confidence on success
    - HTTP 422 with {"detail": "No URL found in screenshot"} when no URL is found
    - HTTP 503 when Tesseract is not installed
    """
    # Guard: OCR library check
    if not OCR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "OCR dependencies (Pillow + pytesseract + Tesseract) are not installed. "
                "Install them with: pip install Pillow pytesseract  "
                "and then install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki"
            ),
        )

    # Guard: file type
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a PNG or JPG screenshot.",
        )

    logger.info(f"POST /predict-image  filename={file.filename}")

    try:
        contents = await file.read()

        # ── OCR: extract text from the top strip of the image ──────────────
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Crop to the top 10% of the image — that's where the address bar is
        width, height = image.size
        address_bar_region = image.crop((0, 0, width, max(1, int(height * 0.10))))

        raw_text = pytesseract.image_to_string(address_bar_region, config="--psm 7")
        logger.debug(f"OCR raw text: {raw_text!r}")

        # Try the full image if the crop finds nothing
        if not raw_text.strip():
            raw_text = pytesseract.image_to_string(image, config="--psm 3")

        # ── URL extraction from OCR text ────────────────────────────────────
        # We look for the first http(s):// token in the OCR output
        url_pattern = re.compile(r"https?://[^\s\"'>]+", re.IGNORECASE)
        matches = url_pattern.findall(raw_text)

        # Also try to detect bare domain.tld patterns as a fallback
        domain_pattern = re.compile(
            r"(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?", re.IGNORECASE
        )

        extracted_url: Optional[str] = None
        confidence: float = 0.0

        if matches:
            extracted_url = matches[0].rstrip(".,;)")
            confidence = 0.90
        else:
            domain_matches = domain_pattern.findall(raw_text)
            if domain_matches:
                extracted_url = f"https://{domain_matches[0].rstrip('.,;)')}"
                confidence = 0.55

        if not extracted_url:
            # Spec requires HTTP 422 when no URL is found
            raise HTTPException(
                status_code=422,
                detail="No URL found in screenshot. Ensure the browser address bar is clearly visible in the top portion of the image.",
            )

        # ── Feature extraction + model ──────────────────────────────────────
        result = extract_features(extracted_url)
        features = result["features"]
        unchecked = result["unchecked_features"]
        warnings = result["warnings"]

        verdict, risk_score = run_model(extracted_url, features)

        return ScanResponse(
            url=extracted_url,
            verdict=verdict,
            risk_score=round(risk_score, 4),
            features=features,
            unchecked_features=unchecked,
            warnings=warnings,
            extracted_url=extracted_url,
            extraction_confidence=round(confidence, 2),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"predict_image failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Image processing error: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# POST /predict — legacy batch CSV prediction (kept for backwards compat)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):
    """Legacy endpoint: Upload a CSV with 30 features and get row-level predictions."""
    try:
        if not file.filename.endswith(".csv"):
            raise HTTPException(status_code=400, detail="Only CSV files are supported.")

        logger.info(f"POST /predict (legacy)  filename={file.filename}")
        df = pd.read_csv(file.file)
        pipeline = get_pipeline()
        predictions = pipeline.predict(df)
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
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
