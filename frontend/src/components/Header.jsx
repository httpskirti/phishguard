import React from 'react';

/**
 * Header Component
 * Displays the system title, cybersecurity tagline, and live backend connection status indicator.
 */
export default function Header({ isOnline, isChecking, onRefreshHealth }) {
  return (
    <header className="border-b border-navy-700 bg-navy-900/80 backdrop-blur px-4 sm:px-8 py-4 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center text-legit shadow-lg shadow-legit/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                PhishGuard
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-700 text-slate-300 border border-navy-600 uppercase tracking-widest">
                MLOps v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time heuristic & ML phishing detection telemetry (UCI 30-feature model)
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status Dot */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-navy-700 text-xs font-mono"
            title={isOnline ? "Backend server reachable" : "Cannot connect to FastAPI backend at port 8000"}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-legit opacity-75"></span>
              )}
              <span 
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isChecking 
                    ? "bg-warn" 
                    : isOnline 
                      ? "bg-legit" 
                      : "bg-phish"
                }`}
              />
            </span>
            <span className={isOnline ? "text-slate-200" : "text-phish-light font-medium"}>
              {isChecking ? "Checking..." : isOnline ? "Backend Online" : "Backend Offline"}
            </span>

            <button
              onClick={onRefreshHealth}
              disabled={isChecking}
              className="ml-1 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
              title="Refresh connection status"
              aria-label="Refresh connection status"
            >
              <svg className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
