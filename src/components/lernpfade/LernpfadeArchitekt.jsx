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
import { Sparkles, Layers, Trophy, Star, Plus, BookOpen, ClipboardCheck, FilePlus, ChevronDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpfadeSektor from '@/components/lernpfade/LernpfadeSektor';
import InfoHint from '@/components/lernpfade/InfoHint';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

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

// Phase E: Statisches Drei-Optionen-Menü. Übergibt direkt die SEKTOR_TYP-
// Werte, die handleAddSektor im Cockpit erwartet (Arbeitsphase öffnet
// ein Modal, Zwischentest wird mit Template befüllt, Individuell legt
// einen leeren Sektor an).
const ADD_SEKTOR_OPTIONS = [
  {
    key: SEKTOR_TYP.ARBEITSPHASE,
    label: 'Arbeitsphase Themenfeld',
    hint: 'Verknüpfung mit einem Themenfeld der Einheit',
    Icon: BookOpen,
    cls: 'text-blue-600',
  },
  {
    key: SEKTOR_TYP.ZWISCHENTEST,
    label: 'Zwischentest',
    hint: 'Einstiegsseite · Zwischentest-Platzhalter',
    Icon: ClipboardCheck,
    cls: 'text-rose-600',
  },
  {
    key: SEKTOR_TYP.FEEDBACK,
    label: 'Feedback',
    hint: 'Schüler-Rückmeldung am Ende der Einheit (immer letzter Sektor)',
    Icon: MessageSquare,
    cls: 'text-emerald-600',
  },
  {
    key: SEKTOR_TYP.INDIVIDUELL,
    label: 'Leerer Sektor',
    hint: 'Ohne vordefinierte Bausteine',
    Icon: FilePlus,
    cls: 'text-muted-foreground',
  },
];

function AddSektorMenu({ onAddSektor, variant = 'default', size = 'sm', className = '' }) {
  const renderItem = (opt) => {
    const Icon = opt.Icon;
    return (
      <DropdownMenuItem key={opt.key} onClick={() => onAddSektor?.(opt.key)}>
        <Icon className={`w-4 h-4 ${opt.cls}`} />
        <div className="flex flex-col">
          <span className="font-medium">{opt.label}</span>
          <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
        </div>
      </DropdownMenuItem>
    );
  };

  // „Leerer Sektor" optisch absetzen.
  const primary = ADD_SEKTOR_OPTIONS.filter((o) => o.key !== SEKTOR_TYP.INDIVIDUELL);
  const leer = ADD_SEKTOR_OPTIONS.find((o) => o.key === SEKTOR_TYP.INDIVIDUELL);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} className={`gap-1.5 ${className}`}>
          <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Sektor-Typ wählen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {primary.map(renderItem)}
        {leer && (
          <>
            <DropdownMenuSeparator />
            {renderItem(leer)}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LernpfadeArchitekt({
  einheitId,
  konfiguration = {},
  activeLernTyp,
  onActiveLernTypChange,
  readOnly = false,
  aufgabenById,
  systemBausteineById,
  onAddSektor,
  onPatchSektor,
  onRemoveSektor,
  onMoveSektor,
  onRemoveAufgabeFromPath,
  onRemoveSystemItem,
  onRemoveBundle,
  onSetBundleConfig,
  onSetBundleModus,
  onAutoFillBundle,
  getIsDropDisabled,
  onSelectAufgabe,
  onSelectSystemBaustein,
  selectedAufgabeId,
  selectedSystemBausteinId,
  getAmpelStatusForItem,
  onOpenAufgabeEditor,
  onOpenGuide,
  canvasScrollRef,
  themenfeldTitelById,
  getDriftStatus,
  driftReportLoading = false,
  onPreviewEinfuehrung,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];
  const aktivLabel = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header / Toolbar / Status-Anzeigen werden vom Cockpit oberhalb
          dieser Komponente gerendert (DashboardToolbar). Hier nur noch
          der reine Canvas. */}

      {/* Canvas */}
      <div ref={canvasScrollRef} className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        {sektoren.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[260px] p-6 text-center rounded-xl border-2 border-dashed border-border bg-card/60">
            <p className="text-sm font-medium text-foreground/70">
              Noch kein Pfad für „{aktivLabel}" angelegt.
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md">
              Lege Sektoren an und ziehe Aufgaben aus dem Pool hinein.
            </p>
            {!readOnly && (
              <div className="inline-flex items-center gap-1.5">
                <AddSektorMenu onAddSektor={onAddSektor} />
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Lerntyp lassen sich beliebig viele Sektoren anlegen.
                </InfoHint>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sektoren.map((sektor, idx) => (
              <LernpfadeSektor
                key={sektor.sektor_id || idx}
                sektor={sektor}
                index={idx}
                totalSektoren={sektoren.length}
                aufgabenById={aufgabenById}
                systemBausteineById={systemBausteineById}
                readOnly={readOnly}
                activeLernTyp={activeLernTyp}
                onPatch={onPatchSektor}
                onRemove={onRemoveSektor}
                onMove={onMoveSektor}
                onRemoveAufgabe={(aufgabeId) => onRemoveAufgabeFromPath?.(aufgabeId)}
                onRemoveSystemItem={onRemoveSystemItem}
                onRemoveBundle={onRemoveBundle}
                onSetBundleConfig={onSetBundleConfig}
                onSetBundleModus={onSetBundleModus}
                onAutoFillBundle={onAutoFillBundle}
                getIsDropDisabled={getIsDropDisabled}
                onSelectAufgabe={onSelectAufgabe}
                onSelectSystemBaustein={onSelectSystemBaustein}
                selectedAufgabeId={selectedAufgabeId}
                selectedSystemBausteinId={selectedSystemBausteinId}
                getAmpelStatusForItem={getAmpelStatusForItem}
                onOpenAufgabeEditor={onOpenAufgabeEditor}
                themenfeldTitelById={themenfeldTitelById}
                onPreviewEinfuehrung={onPreviewEinfuehrung}
                driftStatus={
                  driftReportLoading
                    ? 'loading'
                    : getDriftStatus?.(activeLernTyp, sektor.sektor_id) ?? 'unknown'
                }
              />
            ))}
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <AddSektorMenu onAddSektor={onAddSektor} variant="outline" className="flex-1" />
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Lerntyp lassen sich beliebig viele Sektoren anlegen.
                </InfoHint>
              </div>
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