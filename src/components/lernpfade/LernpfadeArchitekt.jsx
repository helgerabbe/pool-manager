/**
 * LernpfadeArchitekt.jsx
 *
 * Rechte Spalte des Lernpfad-Cockpits (Tab 7).
 * - Header: 4 prominente Tabs für die vier Lerntypen.
 * - Canvas: leerer Drop-Bereich (Basis-Gerüst für @hello-pangea/dnd in Phase 3).
 *
 * Diese Komponente ist bewusst "dumb": sie spiegelt den State, der vom
 * LernpfadeCockpit (debounced) ans Backend zurückgespeichert wird.
 */

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Sparkles, Layers, Trophy, Star, GripVertical } from 'lucide-react';

export const LERN_TYPEN = [
  {
    key: 'minimalist',
    label: 'Minimalist',
    description: 'Konzentriert sich auf das Wesentliche.',
    icon: Sparkles,
    color: {
      bg: 'bg-slate-50',
      bgSolid: 'bg-slate-700',
      border: 'border-slate-300',
      text: 'text-slate-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'pragmatiker',
    label: 'Pragmatiker',
    description: 'Effiziente, lösungsorientierte Reihenfolge.',
    icon: Layers,
    color: {
      bg: 'bg-blue-50',
      bgSolid: 'bg-blue-600',
      border: 'border-blue-300',
      text: 'text-blue-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'ehrgeizig',
    label: 'Ehrgeizig',
    description: 'Fordert mit zusätzlichen Herausforderungen.',
    icon: Trophy,
    color: {
      bg: 'bg-amber-50',
      bgSolid: 'bg-amber-600',
      border: 'border-amber-300',
      text: 'text-amber-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'passioniert',
    label: 'Passioniert',
    description: 'Tiefer Tauchgang mit Projektfokus.',
    icon: Star,
    color: {
      bg: 'bg-violet-50',
      bgSolid: 'bg-violet-600',
      border: 'border-violet-300',
      text: 'text-violet-700',
      textOn: 'text-white',
    },
  },
];

function LernTypTab({ typ, active, count, onClick }) {
  const Icon = typ.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium ${
        active
          ? `${typ.color.bgSolid} ${typ.color.textOn} border-transparent shadow-md`
          : `${typ.color.bg} ${typ.color.text} ${typ.color.border}/50 hover:shadow-sm`
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <div className="text-left">
        <p className="text-sm font-semibold leading-tight">{typ.label}</p>
        <p className={`text-[10px] leading-tight ${active ? 'opacity-90' : 'opacity-70'}`}>
          {count} Sektor{count === 1 ? '' : 'en'}
        </p>
      </div>
    </button>
  );
}

export default function LernpfadeArchitekt({
  konfiguration = {},
  activeLernTyp,
  onActiveLernTypChange,
  readOnly = false,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: 4 Lerntyp-Tabs */}
      <div className="shrink-0 p-3 border-b border-border bg-card">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {LERN_TYPEN.map((typ) => (
            <LernTypTab
              key={typ.key}
              typ={typ}
              active={activeLernTyp === typ.key}
              count={(konfiguration?.[typ.key] || []).length}
              onClick={() => onActiveLernTypChange?.(typ.key)}
            />
          ))}
        </div>
      </div>

      {/* Canvas (DragDropContext liegt im LernpfadeCockpit – damit Cross-Pane-Drag aus dem Pool möglich ist) */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        <Droppable droppableId={`canvas-${activeLernTyp}`} type="AUFGABE" isDropDisabled={readOnly}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-full rounded-xl border-2 border-dashed transition-colors ${
                snapshot.isDraggingOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card/60'
              }`}
            >
              {sektoren.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center">
                  <GripVertical className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-foreground/70">
                    Noch kein Pfad für „{LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label}" angelegt.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    In den nächsten Schritten kannst du hier Sektoren anlegen und Aufgaben aus dem Pool per
                    Drag &amp; Drop einsortieren.
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {sektoren.map((sektor, idx) => (
                    <div
                      key={sektor.sektor_id || idx}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <p className="text-sm font-semibold">{sektor.titel || `Sektor ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {(sektor.aufgaben_ids || []).length} Aufgaben · Modus: {sektor.modus || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {readOnly && (
        <div className="shrink-0 px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800">
          🔒 Nur-Lese-Modus aktiv – Bearbeitung erfordert den Bearbeitungsmodus.
        </div>
      )}
    </div>
  );
}