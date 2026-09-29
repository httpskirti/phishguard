import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Clock, RefreshCw, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, ExternalLink,
  BarChart3, CheckCircle2, XCircle,
} from 'lucide-react';
import { fetchModelInfo, triggerRetrainWithKey } from '../lib/api';

/**
 * Admin View — model status, retraining, and MLflow link.
 * All admin elements use the purple accent to distinguish from user view.
 */
export default function AdminView({ adminKey, isOnline }) {
  const [modelInfo, setModelInfo] = useState(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [infoError, setInfoError] = useState(null);

  // Retrain state
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);
  const [retrainError, setRetrainError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previousMetrics, setPreviousMetrics] = useState(null);

  // Fetch model info on mount
  const loadModelInfo = useCallback(async () => {
    setIsLoadingInfo(true);
    setInfoError(null);
    try {
      const info = await fetchModelInfo(adminKey);
      setModelInfo(info);
    } catch (err) {
      setInfoError(err.message);
    } finally {
      setIsLoadingInfo(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (isOnline) loadModelInfo();
  }, [isOnline, loadModelInfo]);

  // Handle retrain
  const handleRetrain = async () => {
    setShowConfirm(false);
    setIsRetraining(true);
    setRetrainError(null);
    setRetrainResult(null);
    setPreviousMetrics(modelInfo?.metrics || null);

    try {
      const result = await triggerRetrainWithKey(adminKey);
      setRetrainResult(result);
      // Re-fetch model info to show updated metrics
      await loadModelInfo();
    } catch (err) {
      setRetrainError(err.message);
    } finally {
      setIsRetraining(false);
    }
  };

  // Metric comparison helper
  const MetricDelta = ({ label, current, previous }) => {
    if (current == null) return null;
    const pct = (current * 100).toFixed(1);
    let delta = null;
    let DeltaIcon = Minus;
    let deltaColor = 'text-gray-400';

    if (previous != null) {
      const diff = ((current - previous) * 100).toFixed(1);
      if (current > previous) {
        DeltaIcon = TrendingUp;
        deltaColor = 'text-legit-dark';
        delta = `+${diff}%`;
      } else if (current < previous) {
        DeltaIcon = TrendingDown;
        deltaColor = 'text-phish';
        delta = `${diff}%`;
      } else {
        delta = '0.0%';
      }
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="text-2xl font-bold font-mono text-gray-900">{pct}%</div>
        {delta && (
          <div className={`flex items-center justify-center gap-1 text-xs font-mono mt-1 ${deltaColor}`}>
            <DeltaIcon className="w-3 h-3" />
            {delta}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Admin badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono px-3 py-1 rounded-full bg-admin-bg text-admin-dark border border-admin-border font-semibold">
          ⚙ Admin Dashboard
        </span>
      </div>

      {/* ── Model Status Card ── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-admin-dark" />
          <h2 className="text-lg font-bold text-gray-900">Model Status</h2>
          <button
            onClick={loadModelInfo}
            disabled={isLoadingInfo}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh model info"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingInfo ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingInfo ? (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading model information…
          </div>
        ) : infoError ? (
          <div className="text-sm text-phish bg-phish-bg border border-phish-border rounded-lg px-4 py-3">
            {infoError}
          </div>
        ) : !modelInfo?.trained ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No model trained yet</p>
            <p className="text-xs mt-1">Click "Retrain Model" below to train the first model.</p>
          </div>
        ) : (
          <>
            {/* Model metadata row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Model Type</div>
                <div className="text-sm font-bold font-mono text-gray-900 mt-1">
                  {modelInfo.model_type || 'Unknown'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Last Trained</div>
                <div className="text-sm font-bold font-mono text-gray-900 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {modelInfo.last_trained
                    ? new Date(modelInfo.last_trained).toLocaleString()
                    : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Metrics */}
            {modelInfo.metrics && (
              <div className="grid grid-cols-3 gap-3">
                <MetricDelta
                  label="F1 Score"
                  current={modelInfo.metrics.f1_score}
                  previous={previousMetrics?.f1_score}
                />
                <MetricDelta
                  label="Precision"
                  current={modelInfo.metrics.precision_score}
                  previous={previousMetrics?.precision_score}
                />
                <MetricDelta
                  label="Recall"
                  current={modelInfo.metrics.recall_score}
                  previous={previousMetrics?.recall_score}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Retrain Panel ── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-admin-dark" />
          <h2 className="text-lg font-bold text-gray-900">Retrain Model</h2>
        </div>

        {isRetraining ? (
          <div className="flex flex-col items-center gap-3 py-8">
            {/* Indeterminate progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-admin animate-pulse rounded-full" style={{ width: '100%' }} />
            </div>
            <div className="flex items-center gap-2 text-sm text-admin-dark font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Training in progress… This may take several minutes.
            </div>
            <p className="text-xs text-gray-400">
              The full pipeline is running: ingestion → validation → transformation → training
            </p>
          </div>
        ) : showConfirm ? (
          <div className="bg-warn-bg border border-warn-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warn-dark flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Are you sure you want to retrain?
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  This will replace the live model and can take several minutes.
                  The API will continue serving predictions with the old model until
                  training completes.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetrain}
                    disabled={!isOnline}
                    className="px-4 py-1.5 rounded-lg bg-admin-dark text-white text-sm font-medium hover:bg-admin transition-colors disabled:opacity-50"
                  >
                    Yes, retrain now
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isOnline}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-admin-dark text-white text-sm font-medium hover:bg-admin transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retrain Model
            </button>

            {/* Success result */}
            {retrainResult && (
              <div className="mt-4 bg-legit-bg border border-legit-border rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-legit-dark mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Training completed successfully!
                </div>
                <p className="text-xs text-gray-600 font-mono">
                  Test F1: {retrainResult.test_f1_score?.toFixed(4)} · 
                  Train F1: {retrainResult.train_f1_score?.toFixed(4)}
                </p>
              </div>
            )}

            {/* Error result */}
            {retrainError && (
              <div className="mt-4 bg-phish-bg border border-phish-border rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-phish mb-1">
                  <XCircle className="w-4 h-4" />
                  Training failed
                </div>
                <p className="text-xs text-gray-600 font-mono">{retrainError}</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── MLflow link ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
        <ExternalLink className="w-3.5 h-3.5" />
        <span>
          View full training history on{' '}
          <a
            href={modelInfo?.mlflow_tracking_url || "https://dagshub.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-admin-dark hover:underline font-medium"
          >
            MLflow Dashboard (Dagshub) ↗
          </a>
        </span>
      </div>
    </div>
  );
}
