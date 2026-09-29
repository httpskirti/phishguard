import React, { useState } from 'react';
import { KeyRound, X, Loader2 } from 'lucide-react';

/**
 * Modal that prompts for the admin API key.
 * The key is stored in React state (memory only) — never localStorage.
 */
export default function AdminKeyModal({ isOpen, onSubmit, onCancel, error, isLoading }) {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-admin-bg border border-admin-border flex items-center justify-center text-admin-dark">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Admin Access</h2>
            <p className="text-xs text-gray-500">Enter your admin API key to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              id="admin-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter X-Admin-Key value"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-admin focus:border-admin placeholder:text-gray-400"
            />
          </div>

          {error && (
            <div className="text-sm text-phish bg-phish-bg border border-phish-border rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !key.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-admin-dark text-white text-sm font-medium hover:bg-admin transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Authenticate'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
