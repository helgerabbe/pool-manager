/**
 * DeltaModeToggle.jsx
 *
 * Schaltet zwischen Voll- und Delta-Export. Reine Controlled-Komponente.
 */

import React from 'react';
import { Zap } from 'lucide-react';

export default function DeltaModeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-slate-50 border border-slate-200">
      <Zap className="w-4 h-4 text-slate-500" />
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm font-medium text-slate-700">
          Nur Delta-Änderungen exportieren
        </span>
      </label>
      <span className="text-xs text-muted-foreground">
        {value ? 'Nur neue/geänderte Inhalte' : 'Vollständige Daten'}
      </span>
    </div>
  );
}