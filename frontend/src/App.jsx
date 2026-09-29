import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ScanPanel from './components/ScanPanel';
import ResultCard from './components/ResultCard';
import HistoryList from './components/HistoryList';
import StatsRow from './components/StatsRow';
import Disclaimer from './components/Disclaimer';
import AdminView from './components/AdminView';
import AdminKeyModal from './components/AdminKeyModal';
import { checkHealth, predictUrl, predictImage, fetchModelInfo } from './lib/api';

/**
 * PhishGuard – Dual View Web App
 *
 * Views:
 *  - USER View (default): Scan URLs, inspect risk gauge, warnings & 30-feature heuristic breakdown.
 *  - ADMIN View: Retrain ML model, inspect deployed model status, and view metrics (F1/Precision/Recall).
 *
 * Security:
 *  - Admin key is stored in memory only (never localStorage).
 *  - Defanged URLs in scan history and display.
 */

const MAX_HISTORY = 10; // Session-only history cap

export default function App() {
  // ── View State ('user' | 'admin') ─────────────────────────────────────────
  const [view, setView] = useState('user');
  const [adminKey, setAdminKey] = useState(null); // in-memory ONLY
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalError, setAdminModalError] = useState(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  // ── Backend connectivity ─────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  // ── Active scan state ────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null); // string | null
  const [currentResult, setCurrentResult] = useState(null);

  // ── Session history (kept in React state, never persisted) ───────────────
  const [history, setHistory] = useState([]);

  // Ref used to scroll result into view
  const resultRef = useRef(null);

  // ── Health check ─────────────────────────────────────────────────────────
  const handleCheckHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const health = await checkHealth();
    setIsOnline(health.online);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    handleCheckHealth();
    const id = setInterval(handleCheckHealth, 30_000);
    return () => clearInterval(id);
  }, [handleCheckHealth]);

  // ── Admin Switch Handlers ────────────────────────────────────────────────
  const handleOpenAdminModal = () => {
    if (adminKey) {
      // Already authenticated in this session
      setView('admin');
    } else {
      setAdminModalError(null);
      setShowAdminModal(true);
    }
  };

  const handleAdminKeySubmit = async (key) => {
    setIsVerifyingAdmin(true);
    setAdminModalError(null);
    try {
      // Verify key by testing GET /model-info
      await fetchModelInfo(key);
      setAdminKey(key);
      setShowAdminModal(false);
      setView('admin');
    } catch (err) {
      setAdminModalError(err.message === 'Invalid admin key' ? 'Invalid admin API key. Please check and try again.' : err.message);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleSwitchToUser = () => {
    setView('user');
  };

  // ── Core scan handler (shared by URL and image flows) ────────────────────
  const runScan = async (fetchFn) => {
    setIsScanning(true);
    setScanError(null);
    setCurrentResult(null);

    try {
      const result = await fetchFn();
      setCurrentResult(result);
      setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setScanError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanUrl = (url) => runScan(() => predictUrl(url));
  const handleScanImage = (file) => runScan(() => predictImage(file));
  const handleRescanUrl = (correctedUrl) => runScan(() => predictUrl(correctedUrl));

  const handleSelectHistoryItem = (item) => {
    setCurrentResult(item);
    setScanError(null);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleClearHistory = () => setHistory([]);

  // Session aggregates
  const totalScans = history.length;
  const phishingCount = history.filter((r) => r.verdict === 'Phishing').length;
  const safeCount = history.filter((r) => r.verdict === 'Legitimate').length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col font-sans">
      {/* ── Sticky Header with Brand, Online/Offline Dot, and View Toggle ── */}
      <Header
        isOnline={isOnline}
        isChecking={isCheckingHealth}
        onRefreshHealth={handleCheckHealth}
        view={view}
        onSwitchToAdmin={handleOpenAdminModal}
        onSwitchToUser={handleSwitchToUser}
      />

      {/* ── Main content area ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* ── Persistent security disclaimer (always visible) ── */}
        <Disclaimer />

        {/* ── Backend offline warning banner ── */}
        {!isOnline && !isCheckingHealth && (
          <div className="p-4 rounded-2xl bg-phish-bg border border-phish-border text-phish-dark text-xs font-mono flex items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-phish flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Backend Offline:</strong> Cannot reach FastAPI at{' '}
                <code>{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code>.
                Start the backend server (<code>python app.py</code>) to enable scans.
              </span>
            </div>
            <button
              onClick={handleCheckHealth}
              className="px-3 py-1 rounded-lg bg-white border border-phish-border text-phish-dark hover:bg-phish-light transition-colors text-xs font-semibold whitespace-nowrap"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* ── Conditional Rendering: USER VIEW vs ADMIN VIEW ── */}
        {view === 'admin' ? (
          <AdminView adminKey={adminKey} isOnline={isOnline} />
        ) : (
          <>
            {/* Session stats */}
            {totalScans > 0 && (
              <StatsRow
                totalScans={totalScans}
                phishingCount={phishingCount}
                safeCount={safeCount}
              />
            )}

            {/* Scan panel */}
            <ScanPanel
              onScanUrl={handleScanUrl}
              onScanImage={handleScanImage}
              isLoading={isScanning}
              isOnline={isOnline}
            />

            {/* Scan error message */}
            {scanError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-phish-bg border border-phish-border text-phish-dark text-xs font-mono flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-phish flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-bold text-sm mb-0.5">Scan Unsuccessful</div>
                  <p className="text-gray-700">{scanError}</p>
                </div>
              </div>
            )}

            {/* Scan result card */}
            {currentResult && (
              <div ref={resultRef}>
                <ResultCard
                  result={currentResult}
                  onRescanUrl={handleRescanUrl}
                  isLoading={isScanning}
                />
              </div>
            )}

            {/* Session history */}
            <HistoryList
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </>
        )}
      </main>

      {/* ── Admin Key Authentication Modal ── */}
      <AdminKeyModal
        isOpen={showAdminModal}
        onSubmit={handleAdminKeySubmit}
        onCancel={() => setShowAdminModal(false)}
        error={adminModalError}
        isLoading={isVerifyingAdmin}
      />

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-4 px-4 sm:px-8 mt-auto text-center text-xs text-gray-500 font-mono">
        PhishGuard &bull; End-to-End MLOps Phishing Detection &bull; FastAPI + Scikit-Learn + React + Vite
      </footer>
    </div>
  );
}
