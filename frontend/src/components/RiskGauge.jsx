import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * RiskGauge Component
 * Renders a visual threat level gauge for risk_score (0.0 to 1.0).
 * Thresholds:
 * - < 40% : Low Risk (Teal)
 * - 40% - 70%: Medium Risk (Amber)
 * - > 70% : High Risk (Red)
 */
export default function RiskGauge({ riskScore = 0 }) {
  const percentage = Math.min(100, Math.max(0, Math.round(riskScore * 100)));

  let riskCategory = "Low Risk";
  let labelColor = "text-legit-dark";
  let barColor = "bg-legit";
  let borderColor = "border-legit-border";
  let bgBadge = "bg-legit-bg";
  let IconComponent = ShieldCheck;

  if (percentage > 70) {
    riskCategory = "High Threat";
    labelColor = "text-phish-dark";
    barColor = "bg-phish";
    borderColor = "border-phish-border";
    bgBadge = "bg-phish-bg";
    IconComponent = ShieldAlert;
  } else if (percentage >= 40) {
    riskCategory = "Medium Risk";
    labelColor = "text-warn-dark";
    barColor = "bg-warn";
    borderColor = "border-warn-border";
    bgBadge = "bg-warn-bg";
    IconComponent = AlertTriangle;
  }

  return (
    <div className={`p-4 rounded-xl bg-white border ${borderColor} flex flex-col justify-between shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider font-semibold">
          Phishing Probability
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${borderColor} ${bgBadge} ${labelColor}`}>
          <IconComponent className="w-3 h-3" />
          {riskCategory}
        </span>
      </div>

      {/* Numerical Percentage */}
      <div className="flex items-baseline gap-2 my-1">
        <span className={`text-3xl font-mono font-bold tracking-tight ${labelColor}`}>
          {percentage}%
        </span>
        <span className="text-xs font-mono text-gray-400">
          (Score: {riskScore.toFixed(3)})
        </span>
      </div>

      {/* Progress Bar Gauge */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden my-2 border border-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Severity Reference Labels */}
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
        <span className={percentage < 40 ? "text-legit-dark font-bold" : ""}>&lt;40% Low</span>
        <span className={percentage >= 40 && percentage <= 70 ? "text-warn-dark font-bold" : ""}>40-70% Medium</span>
        <span className={percentage > 70 ? "text-phish-dark font-bold" : ""}>&gt;70% High</span>
      </div>
    </div>
  );
}
