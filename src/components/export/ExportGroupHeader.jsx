/**
 * ExportGroupHeader.jsx
 *
 * Kollektiv-Header für eine Gruppe (Einheiten / Basismodule) im
 * Export-Manager. Zeigt das "Alles auswählen"-Häkchen und die Anzahl.
 */

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ExportGroupHeader({ label, allSelected, onToggleAll, count }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2">
        <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
        <span className="text-sm font-semibold text-slate-700">
          {label}
          <span className="ml-2 text-xs text-muted-foreground">({count})</span>
        </span>
      </div>
    </div>
  );
}