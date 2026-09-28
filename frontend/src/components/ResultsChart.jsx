import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

/**
 * ResultsChart Component
 * Renders a compact security donut chart comparing Phishing vs Legitimate website counts
 * using the project's red (#EF4444) and teal (#14B8A6) color system.
 */
export default function ResultsChart({ phishingCount = 0, legitimateCount = 0 }) {
  const total = phishingCount + legitimateCount;

  if (total === 0) {
    return null;
  }

  const data = [
    { name: 'Phishing Threat', value: phishingCount, color: '#EF4444' },
    { name: 'Legitimate Site', value: legitimateCount, color: '#14B8A6' },
  ];

  const phishingRatio = ((phishingCount / total) * 100).toFixed(1);

  // Custom accessible Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-700 shadow-xl text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
            <span className="text-white font-semibold">{item.name}</span>
          </div>
          <p className="text-slate-300">
            Count: <strong className="text-white">{item.value.toLocaleString()}</strong> ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6" aria-label="Visual verdict distribution">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
          <svg className="w-4 h-4 text-legit" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          Telemetry Threat Distribution
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Relative proportion of scanned entities categorized by machine learning classifier
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
          <div className="p-3 rounded-lg bg-navy-950 border border-phish-border">
            <div className="text-[10px] text-phish-light font-mono uppercase tracking-wider">Phishing Ratio</div>
            <div className="text-lg font-mono font-bold text-phish-light">{phishingRatio}%</div>
            <div className="text-[11px] text-slate-400 font-mono">{phishingCount} websites</div>
          </div>
          <div className="p-3 rounded-lg bg-navy-950 border border-legit-border">
            <div className="text-[10px] text-legit-light font-mono uppercase tracking-wider">Legitimate Ratio</div>
            <div className="text-lg font-mono font-bold text-legit-light">{(100 - Number(phishingRatio)).toFixed(1)}%</div>
            <div className="text-[11px] text-slate-400 font-mono">{legitimateCount} websites</div>
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="w-full md:w-64 h-48 flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0B1220" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              formatter={(value) => <span className="text-[11px] font-mono text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
