# PhishGuard — End-to-End MLOps Phishing Website Detection

PhishGuard is an enterprise-grade, end-to-end Machine Learning Operations (MLOps) pipeline designed to classify websites as **phishing** or **legitimate** using 30 URL and webpage content features from the UCI Phishing Websites dataset.

---

## 🏗️ Architecture Overview

The system strictly decouples configuration, pipeline components, and artifacts:

```
[PostgreSQL Database (table: network_data)]
                  │
                  ▼
         data_ingestion.py ──► DataIngestionArtifact (train.csv, test.csv)
                  │
                  ▼
         data_validation.py ──► DataValidationArtifact (schema check + KS drift report)
                  │
                  ▼
         data_transformation.py ──► DataTransformationArtifact (train.npy, test.npy, preprocessing.pkl)
                  │
                  ▼
         model_trainer.py ──► NetworkModel (evaluates 6 models, tracks via MLflow)
                  │
                  ▼
         final_model/ (model.pkl + preprocessor.pkl)
                  │
         ┌────────┴────────┐
         ▼                 ▼
   FastAPI (app.py)   test_model.py
```

---

## 📂 Project Structure

```
network_security/
├── data_schema/
│   └── schema.yaml               # 30 input features + 1 target column schema
├── networksecurity/
│   ├── components/
│   │   ├── data_ingestion.py      # Extract from PostgreSQL, feature store & 80/20 split
│   │   ├── data_validation.py     # Schema check & Kolmogorov-Smirnov drift test
│   │   ├── data_transformation.py # KNNImputer (fit on train only), target remap (-1->0)
│   │   └── model_trainer.py       # Multi-model evaluation, hyperparameter tuning & export
│   ├── constant/
│   │   └── training_pipeline.py   # Immutable pipeline constants, paths, and thresholds
│   ├── entity/
│   │   ├── config_entity.py       # Typed configuration dataclasses per stage
│   │   └── artifact_entity.py     # Immutable output artifacts per stage
│   ├── exception/
│   │   └── exception.py           # NetworkSecurityException with filename & line tracking
│   ├── logging/
│   │   └── logger.py              # Timestamped run logger in logs/
│   ├── pipeline/
│   │   ├── training_pipeline.py   # Training pipeline orchestrator
│   │   └── predict_pipeline.py    # Inference pipeline wrapper
│   └── utils/
│       ├── main_utils/utils.py    # YAML, pickle, numpy, and evaluate_models utilities
│       └── ml_utils/
│           ├── metric/            # Classification metrics (F1, precision, recall)
│           └── model/estimator.py # NetworkModel bundling preprocessor + model
├── final_model/                   # Production-serving serialized model & preprocessor
├── app.py                         # FastAPI web service (/train, /predict)
├── main.py                        # CLI entry point to trigger training
├── push_data.py                   # Initial ETL script to load raw CSV to PostgreSQL
├── test_model.py                  # Evaluation & test script on newest Artifacts test data
├── requirements.txt               # Project dependencies (-e . enabled)
├── setup.py                       # Packaging config (Network_Security)
└── README.md
```

---

## 🚀 Getting Started

### 1. Environment Setup
```bash
python -m venv myvenv
# Windows:
myvenv\Scripts\activate
# Linux/macOS:
source myvenv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
POSTGRES_URL=postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>
# Optional DagsHub / MLflow tracking:
MLFLOW_TRACKING_URI=https://dagshub.com/<username>/<repo>.mlflow
MLFLOW_TRACKING_USERNAME=<username>
MLFLOW_TRACKING_PASSWORD=<token_or_password>
```

### 3. Push Raw Data to PostgreSQL
```bash
python push_data.py phisingData.csv
```

### 4. Run Model Training
```bash
# Via CLI:
python main.py

# Or via FastAPI:
python app.py
# Trigger GET http://localhost:8000/train
```

### 5. Evaluate the Trained Model
```bash
python test_model.py
```

### 6. Serve Predictions via FastAPI
```bash
python app.py
```
Open **http://localhost:8000/docs** to use the interactive Swagger UI and upload test CSV files to `/predict`.

---

## 🎯 Viva & Defense Highlights
1. **Target Remapping**: UCI dataset encodes phishing as `-1` and legitimate as `1`. Sklearn/XGBoost binary cross-entropy and loss formulations require $\{0, 1\}$. Target is converted via `.replace(-1, 0)`.
2. **Preventing Data Leakage**: `KNNImputer` is fitted strictly on `X_train`. The test set and production inference data are only transformed using the saved `preprocessing.pkl`.
3. **Data Drift Detection**: The Kolmogorov-Smirnov two-sample test (`scipy.stats.ks_2samp`) checks for covariate shift ($p < 0.05$) between train and test sets before training proceeds.
4. **Metric Prioritization**: Ranked by **F1-score** rather than raw accuracy because false negatives (letting a phishing site slip through) are significantly more dangerous than false alarms.
5. **Inference Encapsulation**: `NetworkModel` packages the preprocessor and best model into a single callable object, guaranteeing the exact preprocessing steps are applied before inference without train/serve skew.
