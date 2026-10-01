import React from 'react';
import { ArrowLeft, LockKeyhole, RefreshCw, ScanLine } from 'lucide-react';

export default function Header({ isOnline, isChecking, onRefreshHealth, view, onSwitchToAdmin, onSwitchToUser }) {
  return (
    <header className="site-header">
      <a className="brand-lockup" href="#top" aria-label="PhishGuard scanner home">
        <span className="brand-mark"><ScanLine /></span>
        <span className="brand-name">PHISH<strong>GUARD</strong><small>Threat intelligence</small></span>
      </a>
      <div className="header-context">
        <span>{view === 'admin' ? 'Model operations' : 'Live scanner'}</span><i /><span>ML classification</span>
      </div>
      <div className="header-actions">
        <button className="node-status" onClick={onRefreshHealth} disabled={isChecking} title="Refresh API status">
          <span className={isChecking ? 'checking' : isOnline ? 'online' : 'offline'} />
          {isChecking ? 'Checking' : isOnline ? 'Node online' : 'Node offline'}
          <RefreshCw className={isChecking ? 'spin' : ''} />
        </button>
        {view === 'user' ? (
          <button className="admin-action" onClick={onSwitchToAdmin}><LockKeyhole /> Admin</button>
        ) : (
          <button className="admin-action" onClick={onSwitchToUser}><ArrowLeft /> Scanner</button>
        )}
      </div>
    </header>
  );
}
