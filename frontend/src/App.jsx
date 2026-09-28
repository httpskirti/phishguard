import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SummaryCards from './components/SummaryCards';
import UploadPanel from './components/UploadPanel';
import ResultsTable from './components/ResultsTable';
import ResultsChart from './components/ResultsChart';
import RetrainPanel from './components/RetrainPanel';
import { checkHealth, predictBatch } from './lib/api';

/**
 * PhishGuard Security Operations Center (SOC) Dashboard
 * Single-page React application that orchestrates dataset ingestion,
 * schema validation, real-time ML batch classification, and model retraining.
 */
export default function App() {
  // Backend connectivity state
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  // Scan & Results state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [scanError, setScanError] = useState(null);

  // 1. Initial health check on mount
  const handleCheckHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const health = await checkHealth();
    setIsOnline(health.online);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    handleCheckHealth();
  }, [handleCheckHealth]);

  // 2. Handle batch prediction submission
  const handleScanFile = async (file) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const records = await predictBatch(file);
      setScanResults(records);
    } catch (err) {
      setScanError(err.message || "Failed to execute inference scan.");
      setScanResults([]);
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Computed aggregates for SummaryCards and Charts
  const totalScanned = scanResults.length;
  const phishingCount = scanResults.filter(r => Number(r.predicted_column) === 0).length;
  const legitimateCount = scanResults.filter(r => Number(r.predicted_column) === 1).length;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Top Navigation Bar */}
      <Header
        isOnline={isOnline}
        isChecking={isCheckingHealth}
        onRefreshHealth={handleCheckHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Backend Offline Warning Banner */}
        {!isOnline && !isCheckingHealth && (
          <div className="p-4 rounded-xl bg-phish-bg border border-phish-border text-phish-light text-xs font-mono flex items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-phish flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Warning:</strong> Cannot establish connection to FastAPI backend (<code>http://localhost:8000</code>). Ensure the backend server is running via <code>python app.py</code>.
              </span>
            </div>
            <button
              onClick={handleCheckHealth}
              className="px-2.5 py-1 rounded bg-phish-dark text-white hover:bg-phish transition-colors text-xs whitespace-nowrap"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* 2. Key Telemetry Summary Cards */}
        <SummaryCards
          total={totalScanned}
          phishing={phishingCount}
          legitimate={legitimateCount}
        />

        {/* 3. CSV Ingestion & Pre-Scan Validation */}
        <UploadPanel
          onScanFile={handleScanFile}
          isLoading={isScanning}
          isOnline={isOnline}
        />

        {/* Scan Error Message */}
        {scanError && (
          <div className="p-4 rounded-xl bg-phish-bg border border-phish-border text-phish-light text-xs font-mono flex items-start gap-3">
            <svg className="w-5 h-5 text-phish flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-bold text-sm mb-1">Inference Execution Failed</div>
              <p className="text-slate-300">{scanError}</p>
            </div>
          </div>
        )}

        {/* 4. Donut Visual Threat Distribution (Rendered after scan) */}
        {totalScanned > 0 && (
          <ResultsChart
            phishingCount={phishingCount}
            legitimateCount={legitimateCount}
          />
        )}

        {/* 5. Detailed Scan Results Table */}
        {totalScanned > 0 && (
          <ResultsTable results={scanResults} />
        )}

        {/* 6. Model Retraining Controller */}
        <RetrainPanel isOnline={isOnline} />
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-900/60 py-4 px-4 sm:px-8 mt-auto text-center text-xs text-slate-500 font-mono">
        PhishGuard SOC Dashboard &bull; End-to-End MLOps Pipeline &bull; Scikit-Learn + FastAPI + React
      </footer>
    </div>
  );
}
