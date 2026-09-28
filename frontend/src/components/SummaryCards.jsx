import React from 'react';

/**
 * SummaryCards Component
 * Shows primary scan telemetry metrics: Total scanned, Phishing flagged, Legitimate, and Phishing rate.
 * Shows zeros when no scan has been executed.
 */
export default function SummaryCards({ total = 0, phishing = 0, legitimate = 0 }) {
  const phishingPercentage = total > 0 ? ((phishing / total) * 100).toFixed(1) : "0.0";
  const legitimatePercentage = total > 0 ? ((legitimate / total) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      title: "Total Scanned",
      value: total.toLocaleString(),
      subtext: total > 0 ? "Processed records" : "Awaiting scan input",
      borderColor: "border-navy-700",
      textColor: "text-slate-100",
      accent: "bg-navy-700/50 text-slate-300"
    },
    {
      title: "Phishing Flagged",
      value: phishing.toLocaleString(),
      subtext: `${phishingPercentage}% threat ratio`,
      borderColor: "border-phish-border",
      textColor: "text-phish-light",
      accent: "bg-phish-bg text-phish-light"
    },
    {
      title: "Legitimate Sites",
      value: legitimate.toLocaleString(),
      subtext: `${legitimatePercentage}% clean traffic`,
      borderColor: "border-legit-border",
      textColor: "text-legit-light",
      accent: "bg-legit-bg text-legit-light"
    },
    {
      title: "Phishing %",
      value: `${phishingPercentage}%`,
      subtext: total > 0 ? (phishing > 0 ? "High threat concentration" : "Clean sample") : "Baseline inactive",
      borderColor: total > 0 && Number(phishingPercentage) > 30 ? "border-phish-border" : "border-navy-700",
      textColor: total > 0 && Number(phishingPercentage) > 0 ? "text-warn" : "text-slate-300",
      accent: "bg-warn-bg text-warn"
    }
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Scan summary metrics">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-xl bg-navy-900/90 border ${card.borderColor} shadow-md flex flex-col justify-between transition-all duration-150 hover:bg-navy-850`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {card.title}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${card.accent}`}>
              {idx === 0 ? "ENTRIES" : idx === 3 ? "RATIO" : "VERDICT"}
            </span>
          </div>

          <div className="my-1">
            <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${card.textColor}`}>
              {card.value}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {card.subtext}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
