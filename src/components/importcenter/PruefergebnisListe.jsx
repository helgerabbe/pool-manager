import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Die offenen Punkte eines Auftrags — dieselbe Form wie die missingFields der
 * Vollständigkeitsprüfung, damit die einreichende Person Feld für Feld sieht,
 * was noch fehlt.
 */
export default function PruefergebnisListe({ punkte = [] }) {
  if (punkte.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Die Prüfung hat keine offenen Punkte gefunden.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        {punkte.length} offene{punkte.length === 1 ? 'r' : ''} Punkt{punkte.length === 1 ? '' : 'e'}
      </div>
      <ul className="space-y-1.5">
        {punkte.map((p, idx) => (
          <li key={`${p.fieldName}-${idx}`} className="text-sm text-amber-900">
            <span className="font-medium">{p.label || p.fieldName}</span>
            {p.reason ? <span className="text-amber-800"> — {p.reason}</span> : null}
            <span className="ml-1 font-mono text-[11px] text-amber-700/70">{p.fieldName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}