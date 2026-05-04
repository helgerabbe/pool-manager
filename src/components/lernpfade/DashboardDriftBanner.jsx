/**
 * DashboardDriftBanner.jsx
 *
 * Kollapsibles Hinweis-Panel über dem Architekt-Canvas (Etappe 2).
 *
 * Zeigt für den AKTUELL aktiven Lerntyp die erkannten Inkonsistenzen
 * zwischen Strukturdaten und Dashboard-Konfiguration. Verändert NICHTS —
 * pure Anzeige + Counter. Auflösungs-Buttons folgen in Etappe 3.
 *
 * Banner erscheint nur, wenn der Lerntyp Drifts hat (totalDrifts > 0).
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers3,
  Trash2,
  Ghost,
  ArrowRightLeft,
} from 'lucide-react';

const SECTION_META = {
  missing_themenfelder: {
    Icon: Layers3,
    label: 'Themenfelder ohne Sektor',
    cls: 'text-blue-700',
  },
  orphaned_sektoren: {
    Icon: Trash2,
    label: 'Verwaiste Sektoren (Themenfeld gelöscht)',
    cls: 'text-red-700',
  },
  ghost_items: {
    Icon: Ghost,
    label: 'Verwaiste Items (Aufgabe/Lernpaket gelöscht)',
    cls: 'text-rose-700',
  },
  misplaced_aufgaben: {
    Icon: ArrowRightLeft,
    label: 'Aufgaben in falschem Themenfeld',
    cls: 'text-amber-700',
  },
};

function DriftSection({ kind, items, renderItem }) {
  if (!items || items.length === 0) return null;
  const meta = SECTION_META[kind];
  const Icon = meta.Icon;
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${meta.cls}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{meta.label}</span>
        <span className="text-[10px] font-medium text-muted-foreground">({items.length})</span>
      </div>
      <ul className="space-y-0.5 pl-5 text-[11px] text-foreground/80 leading-snug">
        {items.map((it, idx) => (
          <li key={idx} className="list-disc">
            {renderItem(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardDriftBanner({ lerntypReport, lerntypLabel }) {
  const [expanded, setExpanded] = useState(false);

  if (!lerntypReport || lerntypReport.totalDrifts === 0) return null;

  const total = lerntypReport.totalDrifts;

  return (
    <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-100/60 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-xs font-semibold text-amber-900">
          {total} {total === 1 ? 'Inkonsistenz' : 'Inkonsistenzen'} im Dashboard „{lerntypLabel}"
          erkannt
        </span>
        <span className="ml-auto text-[11px] text-amber-800/80 italic">
          {expanded ? 'Details ausblenden' : 'Details anzeigen'}
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-amber-700" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-amber-200 bg-amber-50/60">
          <DriftSection
            kind="missing_themenfelder"
            items={lerntypReport.missing_themenfelder}
            renderItem={(it) => (
              <span>
                Themenfeld <strong>„{it.titel}"</strong> hat noch keinen Sektor in diesem
                Dashboard.
              </span>
            )}
          />
          <DriftSection
            kind="orphaned_sektoren"
            items={lerntypReport.orphaned_sektoren}
            renderItem={(it) => (
              <span>
                Sektor <strong>„{it.titel}"</strong> verweist auf ein Themenfeld, das nicht
                mehr existiert.
              </span>
            )}
          />
          <DriftSection
            kind="ghost_items"
            items={lerntypReport.ghost_items}
            renderItem={(it) => (
              <span>
                In Sektor <strong>„{it.sektor_titel}"</strong>: Item verweist auf eine
                gelöschte Aufgabe oder ein gelöschtes Lernpaket.
              </span>
            )}
          />
          <DriftSection
            kind="misplaced_aufgaben"
            items={lerntypReport.misplaced_aufgaben}
            renderItem={(it) => (
              <span>
                Aufgabe in Sektor <strong>„{it.sektor_titel}"</strong> gehört eigentlich zum
                Themenfeld <strong>„{it.expected_themenfeld_titel}"</strong>.
              </span>
            )}
          />
          <p className="text-[10px] text-amber-800/70 pt-1 italic">
            Auflösungs-Buttons folgen im nächsten Schritt — bis dahin lassen sich diese
            Inkonsistenzen über die normalen Sektor-/Item-Aktionen oder den Guide
            („Standard zurücksetzen") manuell beheben.
          </p>
        </div>
      )}
    </div>
  );
}