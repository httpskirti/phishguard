import React, { useState } from 'react';
import { FEATURE_TAXONOMY, getFeatureChip } from '../lib/features';
import { AlertCircle, Layers } from 'lucide-react';

export default function FeatureGrid({ features = {}, uncheckedFeatures = [] }) {
  const [selectedGroup, setSelectedGroup] = useState('ALL'); // 'ALL' | 'Address bar' | 'Abnormal' | 'HTML-JS' | 'Domain'

  const groups = ['ALL', 'Address bar', 'Abnormal', 'HTML-JS', 'Domain'];

  const filteredFeatures = FEATURE_TAXONOMY.filter((item) => {
    if (selectedGroup === 'ALL') return true;
    return item.group === selectedGroup;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-primary-600" />
          <h4 className="text-xs font-mono font-bold text-gray-900 uppercase tracking-wider">
            30-Feature Heuristic Breakdown
          </h4>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-mono">
          {groups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedGroup === grp
                  ? 'bg-white text-gray-900 font-semibold shadow-xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Feature Cards Grid */}
      <div className="max-h-96 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredFeatures.map((item) => {
            const rawValue = features[item.key] !== undefined ? features[item.key] : 0;
            const chip = getFeatureChip(rawValue);
            const isUnchecked = uncheckedFeatures.includes(item.key);

            return (
              <div
                key={item.key}
                className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/90 hover:border-gray-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="text-xs font-mono font-semibold text-gray-900">
                      {item.label}
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">
                      {item.group} &bull; <code>{item.key}</code>
                    </span>
                  </div>

                  {/* Status Chip */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${chip.bgColor} ${chip.textColor} ${chip.borderColor}`}
                    title={`Feature value: ${chip.code}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${chip.dotColor}`} />
                    {isUnchecked ? "Unverified" : chip.label}
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unchecked Features Alert Note */}
      {uncheckedFeatures && uncheckedFeatures.length > 0 && (
        <div className="p-3.5 rounded-xl bg-warn-bg border border-warn-border text-xs font-mono text-warn-dark flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-warn-dark flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-warn-dark">Unchecked Features Note:</span>
            <p className="text-gray-700 mt-0.5 text-[11px]">
              These signals couldn't be verified, so treat this result as an estimate:{" "}
              <span className="font-semibold text-gray-900">
                {uncheckedFeatures.join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
