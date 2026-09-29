import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import RiskGauge from './RiskGauge';
import FeatureGrid from './FeatureGrid';
import { defangUrl } from '../lib/defang';

/**
 * ResultCard
 * Renders the full scan result after /predict-url or /predict-image responds.
 *
 * Requirements:
 *  - Verdict (red Phishing / teal Legitimate) with icon
 *  - Risk gauge showing risk_score as percentage with Low/Medium/High labels
 *  - "Why this verdict": render `warnings` as a short bulleted list
 *  - Feature grid grouped as Address bar / Abnormal / HTML-JS / Domain
 *  - Visible note listing `unchecked_features`
 *  - Defanged, non-clickable URL representation
 */
export default function ResultCard({ result, onRescanUrl, isLoading }) {
  if (!result) return null;

  const isPhishing = result.verdict === 'Phishing';
  const [editedUrl, setEditedUrl] = useState(result.extracted_url || result.url || '');

  const handleRescanSubmit = (e) => {
    e.preventDefault();
    const trimmed = editedUrl.trim();
    if (trimmed) onRescanUrl(trimmed);
  };

  // We defang the URL for display so it can never accidentally be clicked or executed
  const displayUrl = defangUrl(result.url || result.extracted_url || 'Unknown Target');

  return (
    <section
      className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6"
      aria-label="Scan evaluation result"
    >
      {/* ─── 1. Verdict Banner ─────────────────────────────────────────── */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isPhishing
            ? 'bg-phish-bg border-phish-border'
            : 'bg-legit-bg border-legit-border'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Shield icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
              isPhishing
                ? 'bg-white border-phish-border text-phish'
                : 'bg-white border-legit-border text-legit'
            }`}
          >
            {isPhishing
              ? <ShieldAlert className="w-8 h-8 text-phish" />
              : <ShieldCheck className="w-8 h-8 text-legit" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-500 font-semibold">
                Evaluation Verdict
              </span>
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isPhishing ? 'bg-phish text-white' : 'bg-legit-dark text-white'
                }`}
              >
                {result.verdict}
              </span>
            </div>

            <h3
              className={`text-2xl sm:text-3xl font-sans font-bold tracking-tight mt-0.5 ${
                isPhishing ? 'text-phish-dark' : 'text-legit-dark'
              }`}
            >
              {isPhishing ? 'Phishing Threat Detected' : 'Legitimate Website Verified'}
            </h3>

            {/* SECURITY: URL displayed as defanged plain text */}
            <p className="text-xs text-gray-600 font-mono mt-1 break-all">
              Target:{' '}
              <span className="text-gray-900 font-semibold select-all" title="Defanged — not a clickable link">
                {displayUrl}
              </span>
            </p>
          </div>
        </div>

        {/* Scan metadata */}
        <div className="text-right text-xs font-mono text-gray-500 self-end sm:self-center flex-shrink-0">
          <div>Scanned: {new Date(result.timestamp).toLocaleTimeString()}</div>
          <div className="text-[11px] text-gray-400">
            Source: {result.scanType === 'image' ? 'Screenshot OCR' : 'URL Scan'}
          </div>
        </div>
      </div>

      {/* ─── 2. Risk Gauge (+ OCR details if image scan) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: gauge */}
        <div className="lg:col-span-1">
          <RiskGauge riskScore={result.risk_score} />
        </div>

        {/* Right: Target info & why this verdict highlights */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary-600" />
                Target Analysis Overview
              </span>
              {result.extraction_confidence !== undefined && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200">
                  OCR Confidence: {Math.round(result.extraction_confidence * 100)}%
                </span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-white border border-gray-200 font-mono text-xs text-gray-800 select-all break-all shadow-2xs">
              {defangUrl(result.extracted_url || result.url)}
            </div>

            {result.scanType === 'image' && (
              <p className="text-[11px] text-gray-500 mt-2 font-mono">
                URL was extracted via OCR from the address bar in your screenshot.
              </p>
            )}
          </div>

          {result.scanType === 'image' && (
            <form onSubmit={handleRescanSubmit} className="flex gap-2">
              <input
                type="text"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                placeholder="Correct the extracted URL..."
                disabled={isLoading}
                aria-label="Corrected URL to rescan"
                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={isLoading || !editedUrl.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Rescan
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ─── 3. Why this verdict: Warnings list ─────────────────────────── */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-phish-bg border border-phish-border">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-phish-dark uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-phish" />
            Why this verdict: Detected Risk Warnings ({result.warnings.length})
          </div>
          <ul className="space-y-1.5 text-xs font-mono text-gray-800">
            {result.warnings.map((warn, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-phish font-bold" aria-hidden="true">&bull;</span>
                <span>{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 4. 30-Feature heuristic breakdown grid ────────────────────── */}
      <FeatureGrid
        features={result.features}
        uncheckedFeatures={result.unchecked_features}
      />
    </section>
  );
}
