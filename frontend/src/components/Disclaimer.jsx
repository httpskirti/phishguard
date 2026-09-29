import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-4 py-3 text-xs text-amber-900 font-mono flex items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-warn-dark flex-shrink-0" />
        <span>
          <strong>Persistent Disclaimer:</strong> Student ML project, not a guarantee — don't rely on this alone for banking or credentials.
        </span>
      </div>
      <span className="hidden sm:inline-block text-[10px] text-amber-700/80 uppercase font-semibold tracking-wider">
        Academic Sandbox
      </span>
    </div>
  );
}
