/**
 * API client module for PhishGuard
 * Base URL read from VITE_API_URL, defaulting to http://localhost:8000
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * Helper to extract error detail from FastAPI HTTP 4xx/5xx responses
 */
async function parseErrorResponse(res, fallbackMessage) {
  let detail = fallbackMessage;
  try {
    const errorJson = await res.json();
    if (errorJson.detail) {
      detail = typeof errorJson.detail === 'string' 
        ? errorJson.detail 
        : JSON.stringify(errorJson.detail);
    } else if (errorJson.message) {
      detail = errorJson.message;
    }
  } catch {
    try {
      const text = await res.text();
      if (text) detail = text;
    } catch {
      // Keep fallback
    }
  }
  return detail;
}

/**
 * 1. Health check: GET /
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: { "Accept": "application/json, text/plain" }
    });

    if (!res.ok) {
      return { online: false, message: `Server returned HTTP ${res.status}` };
    }
    return { online: true };
  } catch (err) {
    return { online: false, message: err.message || "Failed to reach server" };
  }
}

/**
 * 2. URL Prediction: POST /predict-url
 * @param {string} url - Target webpage URL
 */
export async function predictUrl(url) {
  const res = await fetch(`${API_BASE_URL}/predict-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ url: String(url).trim() })
  });

  if (!res.ok) {
    const errorDetail = await parseErrorResponse(
      res, 
      `Scan failed with HTTP ${res.status} (${res.statusText})`
    );
    throw new Error(errorDetail);
  }

  const data = await res.json();
  return normalizeResult(data, "url");
}

/**
 * 3. Screenshot Prediction: POST /predict-image
 * @param {File} file - PNG or JPG screenshot
 */
export async function predictImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/predict-image`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errorDetail = await parseErrorResponse(
      res, 
      res.status === 422 
        ? "No URL found in screenshot. Ensure the browser address bar is clearly visible."
        : `Screenshot scan failed with HTTP ${res.status}`
    );
    throw new Error(errorDetail);
  }

  const data = await res.json();
  return normalizeResult(data, "image");
}

/**
 * 4. Fetch model info: GET /model-info  (admin)
 * @param {string} adminKey - The admin API key
 */
export async function fetchModelInfo(adminKey) {
  const res = await fetch(`${API_BASE_URL}/model-info`, {
    headers: {
      "X-Admin-Key": adminKey,
      "Accept": "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error("Invalid admin key");
  }
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res, "Failed to fetch model info"));
  }
  return res.json();
}

/**
 * 5. Trigger retrain: GET /train  (admin)
 * @param {string} adminKey - The admin API key
 */
export async function triggerRetrainWithKey(adminKey) {
  const res = await fetch(`${API_BASE_URL}/train`, {
    headers: {
      "X-Admin-Key": adminKey,
      "Accept": "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error("Invalid admin key");
  }
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res, "Retraining failed"));
  }
  return res.json();
}

/**
 * 6. Legacy batch prediction: POST /predict
 * @param {File} file - CSV file
 */
export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res, `Prediction failed with HTTP ${res.status}`));
  }

  const data = await res.json();
  return (data.predictions || []).map((record) => ({
    ...record,
    predicted_column: record.prediction
  }));
}

/**
 * Normalizes backend response data to ensure required fields exist
 */
function normalizeResult(data, scanType) {
  return {
    url: data.url || data.extracted_url || "Unknown Target",
    extracted_url: data.extracted_url,
    extraction_confidence: data.extraction_confidence,
    verdict: data.verdict || (Number(data.risk_score) > 0.5 ? "Phishing" : "Legitimate"),
    risk_score: Number(data.risk_score ?? 0),
    features: data.features || {},
    unchecked_features: Array.isArray(data.unchecked_features) ? data.unchecked_features : [],
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    timestamp: new Date().toISOString(),
    scanType // 'url' | 'image'
  };
}
