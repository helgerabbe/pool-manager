/**
 * DashboardDriftPill.jsx
 *
 * Kompakte Drift-Anzeige für die Dashboard-Toolbar (eine Zeile).
 * Ersetzt das frühere große gelbe Banner über dem Canvas durch eine kleine
 * Pill „⚠ N Inkonsistenzen". Klick → Popover-Overlay mit Detailliste +
 * Inline-Aktionen. Das Popover liegt ÜBER dem Canvas und drückt den Inhalt
 * nicht nach unten.
 *
 * Aktionen pro Drift-Klasse identisch zum alten Banner:
 *   - missing_themenfelder  → onAddSektor
 *   - orphaned_sektoren     → onRemoveSektor
 *   - ghost_items           → onRemoveItem
 *   - misplaced_aufgaben    → reine Hinweise (Lehrkraft entscheidet)
 *
 * Wenn `lerntypReport` keinen Drift enthält, rendert die Komponente nichts.
 */

import React from 'react';
import {
  AlertTriangle,
  Layers3,
  Trash2,
  Ghost,
  ArrowRightLeft,
  Plus,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SECTION_META = {
  missing_themenfelder: { Icon: Layers3, label: 'Themenfelder ohne Sektor', cls: 'text-blue-700' },
  orphaned_sektoren: { Icon: Trash2, label: 'Verwaiste Sektoren', cls: 'text-red-700' },
  ghost_items: { Icon: Ghost, label: 'Verwaiste Items', cls: 'text-rose-700' },
  misplaced_aufgaben: { Icon: ArrowRightLeft, label: 'Aufgaben in falschem Themenfeld', cls: 'text-amber-700' },
};

function ActionButton({ onClick, disabled, icon: Icon, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="ml-2 inline-flex items-center gap-1 h-5 px-1.5 rounded border border-amber-400/60 bg-white/70 text-[10px] font-medium text-amber-900 hover:bg-white hover:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </button>
  );
}

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
          <li key={idx} className="list-disc">{renderItem(it)}</li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardDriftPill({
  lerntypReport,
  lerntypLabel,
  onAddSektor,
  onRemoveSektor,
  onRemoveItem,
  disabled = false,
}) {
  if (!lerntypReport || lerntypReport.totalDrifts === 0) return null;
  const total = lerntypReport.totalDrifts;
  const disabledTitle = disabled
    ? 'Bearbeitung erforderlich – starte den Bearbeitungsmodus oder hebe die Sperre auf.'
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2 rounded-full border border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
          title={`${total} ${total === 1 ? 'Inkonsistenz' : 'Inkonsistenzen'} im Dashboard „${lerntypLabel}" – Details anzeigen`}
        >
          <AlertTriangle className="w-3 h-3" />
          {total} {total === 1 ? 'Drift' : 'Drifts'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] max-w-[90vw] p-3 bg-amber-50 border-amber-300">
        <div className="flex items-center gap-2 pb-2 border-b border-amber-200 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="text-xs font-semibold text-amber-900">
            Inkonsistenzen im Dashboard „{lerntypLabel}"
          </span>
        </div>
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
          <DriftSection
            kind="missing_themenfelder"
            items={lerntypReport.missing_themenfelder}
            renderItem={(it) => (
              <span>
                Themenfeld <strong>„{it.titel}"</strong> hat keinen Sektor.
                {onAddSektor && (
                  <ActionButton icon={Plus} onClick={() => onAddSektor(it)} disabled={disabled} title={disabledTitle || 'Arbeitsphase-Sektor anlegen'}>
                    Sektor anlegen
                  </ActionButton>
                )}
              </span>
            )}
          />
          <DriftSection
            kind="orphaned_sektoren"
            items={lerntypReport.orphaned_sektoren}
            renderItem={(it) => (
              <span>
                Sektor <strong>„{it.titel}"</strong> verweist auf ein gelöschtes Themenfeld.
                {onRemoveSektor && (
                  <ActionButton icon={Trash2} onClick={() => onRemoveSektor(it)} disabled={disabled} title={disabledTitle || 'Sektor entfernen'}>
                    Sektor entfernen
                  </ActionButton>
                )}
              </span>
            )}
          />
          <DriftSection
            kind="ghost_items"
            items={lerntypReport.ghost_items}
            renderItem={(it) => (
              <span>
                In Sektor <strong>„{it.sektor_titel}"</strong>: gelöschte Aufgabe / Lernpaket.
                {onRemoveItem && (
                  <ActionButton icon={X} onClick={() => onRemoveItem(it)} disabled={disabled} title={disabledTitle || 'Verweis entfernen'}>
                    Aus Pfad entfernen
                  </ActionButton>
                )}
              </span>
            )}
          />
          <DriftSection
            kind="misplaced_aufgaben"
            items={lerntypReport.misplaced_aufgaben}
            renderItem={(it) => (
              <span>
                Aufgabe in <strong>„{it.sektor_titel}"</strong> gehört zu Themenfeld <strong>„{it.expected_themenfeld_titel}"</strong>.
              </span>
            )}
          />
          {disabled && (
            <p className="text-[10px] text-amber-800/70 pt-1 italic">
              Aktionen sind deaktiviert – starte zuerst den Bearbeitungsmodus.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}