import React from 'react';
import { History, Trash2, ArrowUpRight } from 'lucide-react';
import { defangUrl } from '../lib/defang';

export default function HistoryList({ history = [], onSelectHistoryItem, onClearHistory }) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3" aria-label="Session scan history">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-600" />
          <h3 className="text-xs font-mono font-bold text-gray-900 uppercase tracking-wider">
            Session Scan History (Last {history.length})
          </h3>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-gray-400 hover:text-phish-dark font-mono flex items-center gap-1 transition-colors"
          title="Clear session history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear History
        </button>
      </div>

      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {history.map((item, idx) => {
          const isPhish = item.verdict === "Phishing";
          const percentage = Math.round(item.risk_score * 100);
          const defanged = defangUrl(item.url);

          return (
            <div
              key={idx}
              onClick={() => onSelectHistoryItem(item)}
              className="py-2.5 px-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectHistoryItem(item)}
              aria-label={`Open scan for ${defanged}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPhish ? 'bg-phish' : 'bg-legit'}`} />
                <div className="min-w-0">
                  <span className="font-mono text-xs text-gray-900 font-medium block truncate select-all">
                    {defanged}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {item.scanType === 'image' ? 'Screenshot OCR' : 'Direct URL'} &bull; {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-xs">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isPhish 
                    ? 'bg-phish-bg border-phish-border text-phish-dark' 
                    : 'bg-legit-bg border-legit-border text-legit-dark'
                }`}>
                  {item.verdict} ({percentage}%)
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
