/**
 * LernpfadeArchitekt.jsx
 *
 * Rechte Spalte des Lernpfad-Cockpits (Tab 7).
 * - Header: 4 prominente Tabs für die vier Lerntypen.
 * - Canvas: Liste der Sektoren des aktiven Lerntyps + "+ Sektor"-Button + Quick-Add.
 *
 * Diese Komponente hält keinen eigenen State – sie meldet alle Mutationen
 * über onUpdateKonfiguration / onSektorPatch / … nach oben (Cockpit ist
 * Single Source of Truth, der DragDropContext liegt dort).
 */

import React from 'react';
import { Sparkles, Layers, Trophy, Star, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpfadeSektor from '@/components/lernpfade/LernpfadeSektor';

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
  aufgabenById,
  onAddSektor,
  onPatchSektor,
  onRemoveSektor,
  onRemoveAufgabeFromPath,
  onQuickAddOpen,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];
  const aktivLabel = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: 4 Lerntyp-Tabs + Quick-Add */}
      <div className="shrink-0 p-3 border-b border-border bg-card space-y-2">
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
        {!readOnly && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onQuickAddOpen}
              className="gap-1.5 h-7 text-xs"
            >
              <Zap className="w-3 h-3" /> Quick-Add
            </Button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        {sektoren.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[260px] p-6 text-center rounded-xl border-2 border-dashed border-border bg-card/60">
            <p className="text-sm font-medium text-foreground/70">
              Noch kein Pfad für „{aktivLabel}" angelegt.
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md">
              Lege Sektoren an und ziehe Aufgaben aus dem Pool hinein.
            </p>
            {!readOnly && (
              <Button type="button" size="sm" onClick={onAddSektor} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sektoren.map((sektor, idx) => (
              <LernpfadeSektor
                key={sektor.sektor_id || idx}
                sektor={sektor}
                index={idx}
                aufgabenById={aufgabenById}
                readOnly={readOnly}
                onPatch={onPatchSektor}
                onRemove={onRemoveSektor}
                onRemoveAufgabe={(aufgabeId) => onRemoveAufgabeFromPath?.(aufgabeId)}
              />
            ))}
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddSektor}
                className="gap-1.5 w-full"
              >
                <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
              </Button>
            )}
          </div>
        )}
      </div>

      {readOnly && (
        <div className="shrink-0 px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800">
          🔒 Nur-Lese-Modus aktiv – Bearbeitung erfordert den Bearbeitungsmodus.
        </div>
      )}
    </div>
  );
}