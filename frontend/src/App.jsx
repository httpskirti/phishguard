import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, AlertTriangle, Cpu, Radio, ShieldCheck } from 'lucide-react';
import Header from './components/Header';
import ScanPanel from './components/ScanPanel';
import ResultCard from './components/ResultCard';
import HistoryList from './components/HistoryList';
import AdminView from './components/AdminView';
import AdminKeyModal from './components/AdminKeyModal';
import { checkHealth, predictUrl, predictImage, fetchModelInfo } from './lib/api';

const MAX_HISTORY = 10;

export default function App() {
  const [view, setView] = useState('user');
  const [adminKey, setAdminKey] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalError, setAdminModalError] = useState(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const resultRef = useRef(null);

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

  const handleOpenAdminModal = () => {
    if (adminKey) setView('admin');
    else {
      setAdminModalError(null);
      setShowAdminModal(true);
    }
  };

  const handleAdminKeySubmit = async (key) => {
    setIsVerifyingAdmin(true);
    setAdminModalError(null);
    try {
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

  const phishingCount = history.filter((item) => item.verdict === 'Phishing').length;

  return (
    <div className="phishguard-app" id="top">
      <Header
        isOnline={isOnline}
        isChecking={isCheckingHealth}
        onRefreshHealth={handleCheckHealth}
        view={view}
        onSwitchToAdmin={handleOpenAdminModal}
        onSwitchToUser={() => setView('user')}
      />

      {view === 'admin' ? (
        <main className="admin-shell">
          <div className="section-marker"><span /> Model operations / restricted</div>
          <div className="admin-heading">
            <div>
              <p>Model control</p>
              <h1>Training operations.</h1>
            </div>
            <span>Authenticated session</span>
          </div>
          <AdminView adminKey={adminKey} isOnline={isOnline} />
        </main>
      ) : (
        <main>
          <section className="scanner-hero" aria-labelledby="scanner-title">
            <div className="hero-grid" aria-hidden="true" />
            <img className="hero-asset" src="/assets/phishguard-network-cutout.png" alt="" aria-hidden="true" />
            <div className="hero-copy">
              <p className="hero-kicker"><span>01</span> Website threat intelligence</p>
              <h1 id="scanner-title">Inspect the link.<br /><strong>Expose the signal.</strong></h1>
              <p className="hero-description">
                Evaluate a URL or browser screenshot against 30 phishing indicators and a trained classification model.
              </p>
            </div>

            <div className="scanner-dock">
              <ScanPanel
                onScanUrl={(url) => runScan(() => predictUrl(url))}
                onScanImage={(file) => runScan(() => predictImage(file))}
                isLoading={isScanning}
                isOnline={isOnline}
              />
            </div>
            <span className="hero-edge-label">PHISHGUARD / ANALYSIS NODE / 30 SIGNALS</span>
          </section>

          <section className="telemetry-rail" aria-label="Session telemetry">
            <div><Radio /><span>API node</span><strong>{isCheckingHealth ? 'Checking' : isOnline ? 'Operational' : 'Offline'}</strong></div>
            <div><Cpu /><span>Detection surface</span><strong>30 signals</strong></div>
            <div><Activity /><span>Session scans</span><strong>{history.length.toString().padStart(2, '0')}</strong></div>
            <div><AlertTriangle /><span>Threats found</span><strong>{phishingCount.toString().padStart(2, '0')}</strong></div>
          </section>

          <div className="analysis-shell">
            {!isOnline && !isCheckingHealth && (
              <div className="offline-notice" role="alert">
                <AlertTriangle />
                <div><strong>Analysis node offline</strong><span>FastAPI is not responding at {import.meta.env.VITE_API_URL || 'http://localhost:8000'}.</span></div>
                <button onClick={handleCheckHealth}>Retry connection</button>
              </div>
            )}

            {scanError && (
              <div className="scan-error" role="alert">
                <AlertTriangle />
                <div><strong>Scan unsuccessful</strong><span>{scanError}</span></div>
              </div>
            )}

            {currentResult ? (
              <section className="result-zone" ref={resultRef}>
                <div className="section-marker"><span /> Latest analysis / live result</div>
                <ResultCard result={currentResult} onRescanUrl={(url) => runScan(() => predictUrl(url))} isLoading={isScanning} />
              </section>
            ) : (
              <section className="empty-analysis" aria-label="Analysis ready">
                <div className="empty-index">02</div>
                <div>
                  <p>Analysis workspace</p>
                  <h2>Results appear here after your first scan.</h2>
                </div>
                <ShieldCheck aria-hidden="true" />
              </section>
            )}

            <div className="history-zone">
              <HistoryList
                history={history}
                onSelectHistoryItem={(item) => {
                  setCurrentResult(item);
                  setScanError(null);
                  setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                onClearHistory={() => setHistory([])}
              />
            </div>
          </div>
        </main>
      )}

      <footer className="site-footer">
        <span>PhishGuard</span>
        <p>End-to-end MLOps phishing detection</p>
        <small>FastAPI / Scikit-learn / React</small>
      </footer>

      <AdminKeyModal
        isOpen={showAdminModal}
        onSubmit={handleAdminKeySubmit}
        onCancel={() => setShowAdminModal(false)}
        error={adminModalError}
        isLoading={isVerifyingAdmin}
      />
    </div>
  );
}
