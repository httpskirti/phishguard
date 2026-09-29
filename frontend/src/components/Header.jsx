import React from 'react';
import { ShieldCheck, RefreshCw, Lock, ArrowLeft } from 'lucide-react';

export default function Header({
  isOnline,
  isChecking,
  onRefreshHealth,
  view,
  onSwitchToAdmin,
  onSwitchToUser,
}) {
  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-sm">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 font-sans">
                PhishGuard
              </h1>
              {view === 'admin' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-admin-bg text-admin-dark border border-admin-border uppercase tracking-widest font-semibold">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              AI-Powered Phishing Detection — Heuristic & Machine Learning Analysis
            </p>
          </div>
        </div>

        {/* Right side: status + view toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Backend Online / Offline Status Dot */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-mono"
            title={isOnline ? "Backend reachable at port 8000" : "Cannot reach FastAPI backend"}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-legit opacity-75" />
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
            <span className={isOnline ? "text-gray-700" : "text-phish font-medium"}>
              {isChecking ? "Checking..." : isOnline ? "Online" : "Offline"}
            </span>

            <button
              onClick={onRefreshHealth}
              disabled={isChecking}
              className="ml-0.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              title="Refresh connection status"
              aria-label="Refresh connection status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* View toggle */}
          {view === 'user' ? (
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-primary-700 hover:bg-primary-50 transition-colors border border-transparent hover:border-primary-200"
            >
              <Lock className="w-3.5 h-3.5" />
              Switch to Admin
            </button>
          ) : (
            <button
              onClick={onSwitchToUser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-admin-dark hover:text-primary-700 hover:bg-primary-50 transition-colors border border-admin-border"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Scanner
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
