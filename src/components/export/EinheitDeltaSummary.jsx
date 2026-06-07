/**
 * EinheitDeltaSummary.jsx
 *
 * Schlanke Anzeige, die im Freigabe-Cockpit klarmacht: Beim Final-Freigeben
 * geht NICHT die ganze Einheit ans Export-Center, sondern nur das DELTA –
 * also die Elemente, die neu sind (noch nie nach Moodle exportiert) oder seit
 * dem letzten Export geändert wurden.
 *
 * Zählt über alle Einheits-Inhalte (Lernpakete, Aufgaben Ebene 2/3,
 * Aktivitäten, Master-Aufgaben):
 *   - "neu"      → sync_status === 'new'
 *   - "geändert" → sync_status === 'modified'
 *
 * Rein anzeigend. Keine Mutationen.
 */

import React from 'react';
import { Sparkles, PencilLine, CheckCircle2 } from 'lucide-react';

function countDelta(records, einheitId, paketIds) {
  let neu = 0;
  let modified = 0;
  for (const r of records || []) {
    if (r.sync_status === 'to_delete') continue;
    const s = r.sync_status || 'new';
    if (s === 'new') neu += 1;
    else if (s === 'modified') modified += 1;
  }
  return { neu, modified };
}

export default function EinheitDeltaSummary({
  einheit,
  lernpakete = [],
  themenfelder = [],
  allgemeineAufgaben = [],
  aktivitaeten = [],
  masterAufgaben = [],
}) {
  const einheitId = einheit?.id;

  const summary = React.useMemo(() => {
    if (!einheitId) return { neu: 0, modified: 0 };

    // Lernpakete dieser Einheit (über einheit_id ODER Themenfeld-Zugehörigkeit).
    const tfIds = new Set(
      themenfelder.filter((t) => t.einheit_id === einheitId).map((t) => t.id)
    );
    const pakete = lernpakete.filter(
      (lp) => lp.einheit_id === einheitId || tfIds.has(lp.themenfeld_id)
    );
    const paketIds = new Set(pakete.map((lp) => lp.id));

    const aufgaben = allgemeineAufgaben.filter((a) => a.einheit_id === einheitId);
    const akt = aktivitaeten.filter((a) => paketIds.has(a.lernpaket_id));
    const master = masterAufgaben.filter((m) => paketIds.has(m.lernpaket_id));

    const parts = [
      countDelta(pakete),
      countDelta(aufgaben),
      countDelta(akt),
      countDelta(master),
    ];
    return parts.reduce(
      (acc, p) => ({ neu: acc.neu + p.neu, modified: acc.modified + p.modified }),
      { neu: 0, modified: 0 }
    );
  }, [einheitId, lernpakete, themenfelder, allgemeineAufgaben, aktivitaeten, masterAufgaben]);

  const total = summary.neu + summary.modified;

  if (total === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Aktuell gibt es <strong>keine neuen oder geänderten Elemente</strong>.
          Alles ist bereits mit Moodle synchron – es würde nichts an das
          Export-Center gemeldet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <p className="text-xs text-amber-900 leading-relaxed">
        Bei der finalen Freigabe wird <strong>nur das Delta</strong> an das
        Export-Center gemeldet – nicht die ganze Einheit:
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {summary.neu > 0 && (
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-blue-300 bg-blue-100 text-blue-800 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            {summary.neu} {summary.neu === 1 ? 'neues Element' : 'neue Elemente'}
          </span>
        )}
        {summary.modified > 0 && (
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-amber-300 bg-amber-100 text-amber-800 text-[11px] font-semibold">
            <PencilLine className="w-3 h-3" />
            {summary.modified} {summary.modified === 1 ? 'geändertes Element' : 'geänderte Elemente'}
          </span>
        )}
      </div>
    </div>
  );
}