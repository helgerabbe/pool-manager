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
import { Sparkles, Layers, Trophy, Star, Plus, BookOpen, ShieldCheck, ShieldOff, Loader2, PenLine, ClipboardCheck, FilePlus, ChevronDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpfadeSektor from '@/components/lernpfade/LernpfadeSektor';
import InfoHint from '@/components/lernpfade/InfoHint';
import EinheitFreigabeBlock from '@/components/lernpfade/EinheitFreigabeBlock';
import DashboardDriftBanner from '@/components/lernpfade/DashboardDriftBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

function StatusBadge({ aktivLabel, istPfadGesperrt }) {
  const tooltipContent = (
    <div className="max-w-xs space-y-2 text-xs leading-snug">
      <p className="font-semibold">Status des Lernpfads</p>
      <p>
        Hier siehst du, in welchem Zustand sich der Pfad <strong>„{aktivLabel}"</strong> aktuell befindet.
      </p>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong>Entwurf:</strong> Der Pfad wird noch geplant. Sektoren und Aufgaben können frei verändert werden. Schüler sehen ihn noch nicht.
        </li>
        <li>
          <strong>Gesperrt:</strong> Der Pfad wurde geprüft, freigegeben und ist für Schüler sichtbar. Änderungen sind erst nach „Entsperren" wieder möglich.
        </li>
      </ul>
      <p className="text-muted-foreground">
        Künftig kommen weitere Zustände hinzu (z. B. „In Prüfung" oder „Archiviert").
      </p>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {istPfadGesperrt ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 cursor-help">
              <ShieldCheck className="w-3 h-3" />
              {aktivLabel} · gesperrt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5 cursor-help">
              {aktivLabel} · Entwurf
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card text-card-foreground border border-border shadow-md p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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

function LernTypTab({ typ, active, count, onClick }) {
  const Icon = typ.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${typ.label} – ${count} Sektor${count === 1 ? '' : 'en'}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all font-medium text-xs ${
        active
          ? `${typ.color.bgSolid} ${typ.color.textOn} border-transparent shadow-sm`
          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-semibold leading-tight">{typ.label}</span>
      <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-white/80 border border-slate-200'}`}>
        {count}
      </span>
    </button>
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
  // Status-Bereich (rechts) – ehemals CockpitActionToolbar
  istPfadGesperrt = false,
  darfFreigeben = false,
  darfEntsperren = false,
  statusBusy = false,
  onReleasePath,
  onUnlockPath,
  saveIcon: SaveIcon,
  saveIconCls,
  saveTitle,
  // Bearbeitungs-Modus (in 2. Zeile statt globalem Banner)
  isStructuralEditingActive = false,
  isEndingEdit = false,
  onEndEditing,
  // Etappe 1+2: Drift-Report für den aktuell aktiven Lerntyp.
  driftForActiveLerntyp = null,
  // Etappe 3: Inline-Aktionen aus dem Drift-Banner.
  onDriftAddSektor,
  onDriftRemoveSektor,
  onDriftRemoveItem,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];
  const aktivLabel = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label;

  // „Prüfen & freigeben" / „Entsperren" / Status-Badge wandern in den
  // Canvas-Bereich (über dem ersten Sektor). Hier oben bleibt nur noch
  // der globale „Bearbeitung beenden"-Button, falls aktiv.
  const showTopActionRow = isStructuralEditingActive && !!onEndEditing;
  const showInlineReleaseRow = darfFreigeben || darfEntsperren;

  // Inline Status- + Freigabe-Zeile, die direkt über dem ersten Sektor
  // im Canvas erscheint (rechtsbündig, kompakt).
  const inlineReleaseRow = showInlineReleaseRow ? (
    <div className="flex items-center gap-1.5 flex-wrap justify-start mb-2">
      <StatusBadge aktivLabel={aktivLabel} istPfadGesperrt={istPfadGesperrt} />
      {istPfadGesperrt && darfEntsperren && (
        <div className="inline-flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onUnlockPath}
            disabled={statusBusy}
            className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
          >
            {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
            Entsperren
          </Button>
          <InfoHint title="Lernpfad entsperren">
            Hebt die Freigabe wieder auf, sodass Sektoren und Aufgaben erneut verändert werden können. Nur Admins und die Fachschaftsleitung dürfen entsperren.
          </InfoHint>
        </div>
      )}
      {!istPfadGesperrt && darfFreigeben && (
        <div className="inline-flex items-center gap-1">
          <Button
            size="sm"
            onClick={onReleasePath}
            disabled={statusBusy || readOnly}
            className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            title={readOnly ? 'Bitte zuerst Bearbeiten starten' : `„${aktivLabel}" validieren und freigeben`}
          >
            {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            Prüfen & freigeben
          </Button>
          <InfoHint title="Prüfen & freigeben">
            Validiert den aktuellen Lernpfad „{aktivLabel}" (alle Aufgaben grün?) und gibt ihn anschließend für die Schüler frei. Danach ist der Pfad gesperrt – Änderungen sind erst nach „Entsperren" wieder möglich.
          </InfoHint>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Schritt 3 des Freigabe-Workflows: Status-Block der gesamten Einheit
          ganz oben. Zeigt 4-Dashboard-Übersicht und ggf. Final-Release-Button. */}
      {einheitId && (
        <EinheitFreigabeBlock einheitId={einheitId} darfFreigeben={darfFreigeben} />
      )}

      {/* Zeile oben: nur „Bearbeitung beenden" (Status & Freigabe sind in den
          Canvas verschoben, siehe inlineReleaseRow). */}
      {showTopActionRow && (
        <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30 flex items-center justify-end gap-1.5 flex-wrap">
          <Button
            size="sm"
            onClick={onEndEditing}
            disabled={isEndingEdit}
            className="gap-1.5 h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
            title="Bearbeitungsmodus beenden – andere Nutzer können dann wieder Änderungen vornehmen"
          >
            {isEndingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
            Bearbeitung beenden
          </Button>
        </div>
      )}

      {/* Lerntyp-Pills + Guide (links). Save-Indicator rechts. */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border bg-card flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {LERN_TYPEN.map((typ) => (
            <LernTypTab
              key={typ.key}
              typ={typ}
              active={activeLernTyp === typ.key}
              count={(konfiguration?.[typ.key] || []).length}
              onClick={() => onActiveLernTypChange?.(typ.key)}
            />
          ))}
          {onOpenGuide && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenGuide}
              className="gap-1.5 h-7 text-[11px] px-2.5"
              title="Didaktische Erklärung & Standard-Raster für diesen Lerntyp"
            >
              <BookOpen className="w-3 h-3" />
              Guide
            </Button>
          )}
        </div>

        {SaveIcon && (
          <span title={saveTitle} className="ml-auto inline-flex items-center">
            <SaveIcon className={`w-3.5 h-3.5 ${saveIconCls || ''}`} />
          </span>
        )}
      </div>

      {/* Canvas */}
      <div ref={canvasScrollRef} className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        {inlineReleaseRow}
        <DashboardDriftBanner
          lerntypReport={driftForActiveLerntyp}
          lerntypLabel={aktivLabel}
          onAddSektor={onDriftAddSektor}
          onRemoveSektor={onDriftRemoveSektor}
          onRemoveItem={onDriftRemoveItem}
          disabled={readOnly}
        />
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