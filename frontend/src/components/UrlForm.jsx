import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, Loader2 } from 'lucide-react';

const SCAN_MESSAGES = ['Resolving DNS', 'Inspecting TLS', 'Fetching domain data', 'Analyzing content', 'Running classifier'];
const EXAMPLE_URLS = ['https://google.com', 'https://example.com/login'];

export default function UrlForm({ onScanUrl, isLoading, isOnline }) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [scanMsgIndex, setScanMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setScanMsgIndex(0);
      return undefined;
    }
    const id = setInterval(() => setScanMsgIndex((prev) => (prev + 1) % SCAN_MESSAGES.length), 2500);
    return () => clearInterval(id);
  }, [isLoading]);

  const validateUrl = (value) => {
    if (!value.trim()) return false;
    const testUrl = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    try {
      const parsed = new URL(testUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) throw new Error();
      setValidationError('');
      return true;
    } catch {
      setValidationError('Enter a valid domain, such as example.com');
      return false;
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validateUrl(url)) return;
    onScanUrl(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
  };

  return (
    <div className="url-inspector">
      <form onSubmit={submit}>
        <label htmlFor="scan-url"><Globe2 /><span>URL or domain</span></label>
        <div className={validationError ? 'url-control invalid' : 'url-control'}>
          <input
            id="scan-url"
            type="text"
            value={url}
            onChange={(event) => { setUrl(event.target.value); if (validationError) setValidationError(''); }}
            onBlur={() => url && validateUrl(url)}
            placeholder="https://example.com/login"
            disabled={isLoading}
            autoComplete="url"
          />
          <button type="submit" disabled={isLoading || !isOnline || !url.trim()}>
            {isLoading ? <><Loader2 className="spin" /> Scanning</> : <>Inspect site <ArrowRight /></>}
          </button>
        </div>
        {validationError && <p className="input-error">{validationError}</p>}
      </form>
      <div className="scan-meta">
        {isLoading ? (
          <span className="scan-progress"><i /> {SCAN_MESSAGES[scanMsgIndex]}</span>
        ) : (
          <div className="example-list"><span>Try a target</span>{EXAMPLE_URLS.map((item) => <button type="button" key={item} onClick={() => { setUrl(item); onScanUrl(item); }} disabled={!isOnline}>{item}</button>)}</div>
        )}
        <small>URLs are defanged in session history</small>
      </div>
    </div>
  );
}
