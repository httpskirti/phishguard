/**
 * API client module for PhishGuard Backend
 * Connects to FastAPI running at VITE_API_URL or http://localhost:8000
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * 1. Health check: GET /
 * Returns { online: boolean, statusText: string }
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: { "Accept": "application/json, text/plain" }
    });

    if (!res.ok) {
      return { online: false, message: `Status code ${res.status}` };
    }

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { online: true, data };
  } catch (err) {
    return { online: false, error: err.message || "Failed to reach server" };
  }
}

/**
 * 2. Prediction endpoint: POST /predict
 * Accepts a File object (CSV).
 * 
 * Note on backend contract:
 * - Returns JSON records with extra column 'predicted_column' (1 = Legitimate, 0 = Phishing)
 * - May arrive as double-stringified JSON from pandas df.to_json(), so we handle both single and double JSON.parse.
 * - Also normalizes if the backend returned an array or wrapped { predictions: [...] }.
 */
export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    let errorDetail = `Prediction request failed (${res.status})`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      const errText = await res.text();
      if (errText) errorDetail = errText;
    }
    throw new Error(errorDetail);
  }

  // Parse response body, handling possible stringified JSON or double-encoded JSON
  const rawText = await res.text();
  let parsedData;

  try {
    parsedData = JSON.parse(rawText);
    // If the output is still a string (e.g., df.to_json() returned as JSON string literal), parse again
    if (typeof parsedData === "string") {
      parsedData = JSON.parse(parsedData);
    }
  } catch (err) {
    throw new Error(`Failed to parse prediction response JSON: ${err.message}`);
  }

  // Unwrap array if returned inside an envelope { predictions: [...] }
  let records = [];
  if (Array.isArray(parsedData)) {
    records = parsedData;
  } else if (parsedData && Array.isArray(parsedData.predictions)) {
    records = parsedData.predictions;
  } else if (typeof parsedData === "object" && parsedData !== null) {
    // If it's a pandas dictionary format (index-keyed or records)
    records = Object.values(parsedData);
  }

  // Normalize column names and enforce numeric predicted_column (1 = Legitimate, 0 = Phishing)
  const normalizedRecords = records.map((row, index) => {
    // Support either 'predicted_column' (per contract) or 'prediction'
    const rawPrediction = row.predicted_column !== undefined ? row.predicted_column : row.prediction;
    const numericVerdict = Number(rawPrediction);

    return {
      __rowId: index + 1,
      ...row,
      predicted_column: isNaN(numericVerdict) ? 0 : numericVerdict
    };
  });

  return normalizedRecords;
}

/**
 * 3. Retrain pipeline: GET /train
 * Calls the long-running model training pipeline.
 */
export async function triggerRetrain() {
  const res = await fetch(`${API_BASE_URL}/train`, {
    method: "GET"
  });

  if (!res.ok) {
    let errorDetail = `Retraining failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      const errText = await res.text();
      if (errText) errorDetail = errText;
    }
    throw new Error(errorDetail);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}
