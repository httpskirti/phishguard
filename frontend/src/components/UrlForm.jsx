import React, { useState, useEffect } from 'react';
import { Search, Loader2, Globe } from 'lucide-react';

// Progressive scanning messages shown while the backend works
const SCAN_MESSAGES = [
  'Resolving DNS…',
  'Checking SSL certificate…',
  'Fetching WHOIS data…',
  'Analyzing page content…',
  'Running ML model…',
];

// Example URLs for users to try (mix of safe and suspicious patterns)
const EXAMPLE_URLS = [
  'https://google.com',
  'http://192.168.1.1/login',
  'https://paypal-security-verify.com',
];

export default function UrlForm({ onScanUrl, isLoading, isOnline }) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [scanMsgIndex, setScanMsgIndex] = useState(0);

  // Cycle through scanning messages while loading
  useEffect(() => {
    if (!isLoading) {
      setScanMsgIndex(0);
      return;
    }
    const id = setInterval(() => {
      setScanMsgIndex((prev) => (prev + 1) % SCAN_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [isLoading]);

  // Client-side URL validation
  const validateUrl = (value) => {
    if (!value.trim()) {
      setValidationError('');
      return false;
    }
    let testUrl = value.trim();
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = `https://${testUrl}`;
    }
    try {
      const parsed = new URL(testUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        setValidationError('Enter a valid domain name (e.g. example.com)');
        return false;
      }
      setValidationError('');
      return true;
    } catch {
      setValidationError('This doesn\'t look like a valid URL');
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateUrl(url)) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    onScanUrl(finalUrl);
  };

  const handleExampleClick = (exampleUrl) => {
    setUrl(exampleUrl);
    setValidationError('');
    onScanUrl(exampleUrl);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (validationError) validateUrl(e.target.value);
              }}
              onBlur={() => url && validateUrl(url)}
              placeholder="https://example.com/login"
              disabled={isLoading}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-400 ${
                validationError
                  ? 'border-phish focus:ring-phish/30'
                  : 'border-gray-300 focus:ring-primary-500/30 focus:border-primary-500'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !isOnline || !url.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Check this site
              </>
            )}
          </button>
        </div>

        {/* Validation error */}
        {validationError && (
          <p className="text-xs text-phish px-1">{validationError}</p>
        )}

        {/* Progressive scan message */}
        {isLoading && (
          <div className="flex items-center gap-2 px-1 text-xs text-primary-600 font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            {SCAN_MESSAGES[scanMsgIndex]}
          </div>
        )}
      </form>

      {/* Example URLs */}
      {!isLoading && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Try:</span>
          {EXAMPLE_URLS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleExampleClick(ex)}
              disabled={!isOnline}
              className="text-xs font-mono px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-gray-200 hover:border-primary-200 disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
