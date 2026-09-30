import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

/**
 * VerdictBadge Component
 * Renders an accessible, high-contrast security badge for Phishing or Legitimate verdicts.
 * Color signals are always paired with text and distinct icons.
 */
export default function VerdictBadge({ verdict }) {
  const isLegit = verdict === 'Legitimate' || Number(verdict) === 1;

  if (isLegit) {
    return ( 
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-legit-bg text-legit-dark border border-legit-border">
        <ShieldCheck className="w-3.5 h-3.5 text-legit-dark" />
        Legitimate
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-phish-bg text-phish-dark border border-phish-border">
      <ShieldAlert className="w-3.5 h-3.5 text-phish" />
      Phishing
    </span>
  );
}
