import React from 'react';
import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function StatsRow({ totalScans = 0, phishingCount = 0, safeCount = 0 }) {
  const cards = [
    {
      label: "Scans This Session",
      value: totalScans,
      icon: Activity,
      borderColor: "border-gray-200",
      textColor: "text-gray-900",
      accentBg: "bg-primary-50 text-primary-700"
    },
    {
      label: "Phishing Threats Found",
      value: phishingCount,
      icon: ShieldAlert,
      borderColor: "border-phish-border",
      textColor: "text-phish-dark",
      accentBg: "bg-phish-bg text-phish-dark"
    },
    {
      label: "Safe Sites Verified",
      value: safeCount,
      icon: ShieldCheck,
      borderColor: "border-legit-border",
      textColor: "text-legit-dark",
      accentBg: "bg-legit-bg text-legit-dark"
    }
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Session telemetry statistics">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-white border ${card.borderColor} shadow-sm flex items-center justify-between transition-colors`}
          >
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                {card.label}
              </span>
              <div className={`text-2xl font-mono font-bold ${card.textColor}`}>
                {card.value.toLocaleString()}
              </div>
            </div>

            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.accentBg} border border-transparent`}>
              <IconComponent className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </section>
  );
}
