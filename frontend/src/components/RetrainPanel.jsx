import React, { useState } from 'react';
import { triggerRetrain } from '../lib/api';

/**
 * RetrainPanel Component
 * Provides manual trigger for the backend TrainingPipeline (GET /train).
 * Requires confirmation before firing since full MLOps pipeline training is resource-intensive.
 * Shows spinner, timer, and success/error status messages.
 */
export default function RetrainPanel({ isOnline }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [startTime, setStartTime] = useState(null);

  const handleStartRetrain = async () => {
    setShowConfirm(false);
    setIsRetraining(true);
    setRetrainStatus(null);
    setStartTime(Date.now());

    try {
      const response = await triggerRetrain();
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      
      let message = "Training pipeline executed successfully! Model and preprocessor updated in final_model/.";
      if (typeof response === 'string') {
        message = response;
      } else if (response && response.message) {
        message = `${response.message} (Test F1: ${(response.test_f1_score || 0).toFixed(4)})`;
      }

      setRetrainStatus({
        type: 'success',
        message: `${message} [Duration: ${durationSeconds || 1}s]`
      });
    } catch (err) {
      setRetrainStatus({
        type: 'error',
        message: err.message || "Retraining request encountered a failure."
      });
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
            <svg className="w-4 h-4 text-warn" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            MLOps Model Retraining
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Pulls fresh records from PostgreSQL, detects dataset drift, runs GridSearchCV, and promotes the best model.
          </p>
        </div>

        {/* Action Button */}
        {!isRetraining && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!isOnline}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 ${
              isOnline
                ? "bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-600 cursor-pointer"
                : "bg-navy-950 text-slate-500 border border-navy-800 cursor-not-allowed"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-warn" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Retrain Model
          </button>
        )}
      </div>

      {/* Confirmation Prompt */}
      {showConfirm && (
        <div className="mt-4 p-4 rounded-lg bg-navy-950 border border-warn-border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-slate-300">
            <strong className="text-warn">Confirm Pipeline Trigger:</strong> Retraining involves full data ingestion, drift testing, and hyperparameter tuning across 6 classifiers. This can take several minutes.
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRetrain}
              className="px-3 py-1.5 rounded bg-warn hover:bg-warn-dark text-navy-950 font-bold"
            >
              Confirm & Start
            </button>
          </div>
        </div>
      )}

      {/* Loading Progress State */}
      {isRetraining && (
        <div className="mt-4 p-4 rounded-lg bg-navy-950 border border-navy-700 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-warn" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-xs">
            <p className="font-mono text-white font-medium">Training Pipeline in Progress (GET /train)...</p>
            <p className="text-slate-400 mt-0.5">
              Ingesting from PostgreSQL $\rightarrow$ Schema Validation $\rightarrow$ KNN Imputation $\rightarrow$ GridSearchCV Model Evaluation
            </p>
          </div>
        </div>
      )}

      {/* Status Feedback */}
      {retrainStatus && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs font-mono flex items-start gap-2 ${
            retrainStatus.type === 'success'
              ? 'bg-legit-bg border border-legit-border text-legit-light'
              : 'bg-phish-bg border border-phish-border text-phish-light'
          }`}
        >
          {retrainStatus.type === 'success' ? (
            <svg className="w-4 h-4 text-legit flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-phish flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span>{retrainStatus.message}</span>
        </div>
      )}
    </section>
  );
}
