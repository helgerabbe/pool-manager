/**
 * DashboardToolbar.jsx
 *
 * Konsolidierte EINE-Zeile-Toolbar für Tab 7 „Dashboards". Ersetzt die
 * früheren drei Header-Zeilen (EinheitFreigabeBlock, Lerntyp-Tab-Reihe,
 * inline Status/Release-Reihe) durch eine durchgehende Leiste.
 *
 * Aufbau (links → rechts):
 *   1. Einheit-Status-Badge (export_lifecycle_status)
 *   2. 4 Lerntyp-Pills mit Status-Dot (Entwurf/Gesperrt) + Sektor-Count;
 *      Klick wechselt das aktive Dashboard, Hover erklärt den Status.
 *   3. „X / 4 geprüft"-Indikator
 *   4. Drift-Pill (Popover-Overlay, drückt Canvas nicht nach unten)
 *   5. Guide-Button
 *   6. Spacer (ml-auto)
 *   7. „Dashboard prüfen & freigeben" / „Entsperren" (aktiver Pfad)
 *   8. „Einheit final freigeben" / „Freigabe aufheben"
 *   9. „Bearbeitung beenden" (im Edit-Modus)
 *  10. Save-Indicator (Icon)
 *
 * Reine Präsentationskomponente — alle Mutations werden vom Cockpit über
 * Callbacks gereicht.
 */

import React from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Lock,
  Truck,
  Loader2,
  BookOpen,
  PenLine,
  CheckCircle2,
  Sparkles,
  Layers,
  Trophy,
  Star,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EXPORT_LIFECYCLE_STATUS, EXPORT_LIFECYCLE_LABELS } from '@/lib/exportLifecycle';
import DashboardDriftPill from '@/components/lernpfade/DashboardDriftPill';
import InfoHint from '@/components/lernpfade/InfoHint';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, activeBg: 'bg-slate-700', activeText: 'text-white', inactiveText: 'text-slate-700' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, activeBg: 'bg-blue-600', activeText: 'text-white', inactiveText: 'text-blue-700' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, activeBg: 'bg-amber-600', activeText: 'text-white', inactiveText: 'text-amber-700' },
  passioniert: { label: 'Passioniert', icon: Star, activeBg: 'bg-violet-600', activeText: 'text-white', inactiveText: 'text-violet-700' },
};
const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Lerntyp-Pill: Tab-Switcher + Status-Anzeige ─────────────────────────────
function LerntypPill({ typKey, active, count, locked, onClick }) {
  const meta = LERNTYP_META[typKey];
  const Icon = meta.icon;
  // Status-Dot: grün=gesperrt(geprüft), grau=Entwurf
  const dotCls = locked ? 'bg-emerald-500' : 'bg-slate-300';
  const dotTitle = locked ? 'Geprüft & gesperrt' : 'Entwurf';

  const tooltip = (
    <div className="max-w-[240px] space-y-1 text-xs leading-snug">
      <p className="font-semibold">{meta.label}</p>
      <p>
        <span className="font-medium">Status:</span> {locked ? 'Geprüft & für Schüler freigegeben' : 'Entwurf – noch in Bearbeitung'}
      </p>
      <p className="text-muted-foreground">{count} Sektor{count === 1 ? '' : 'en'}</p>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-md border text-[11px] font-semibold transition-all ${
              active
                ? `${meta.activeBg} ${meta.activeText} border-transparent shadow-sm`
                : `bg-card ${meta.inactiveText} border-border hover:bg-muted`
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${dotCls} shrink-0`} title={dotTitle} />
            <Icon className="w-3 h-3 shrink-0" />
            <span>{meta.label}</span>
            <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-muted'}`}>
              {count}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card text-card-foreground border border-border shadow-md p-2.5">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Einheit-Status-Badge ────────────────────────────────────────────────────
function EinheitStatusBadge({ status }) {
  const label = EXPORT_LIFECYCLE_LABELS[status] || EXPORT_LIFECYCLE_LABELS.draft;
  const cls =
    status === EXPORT_LIFECYCLE_STATUS.PUBLISHED
      ? 'bg-blue-600 text-white border-transparent'
      : status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
        ? 'bg-orange-500 text-white border-transparent'
        : status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN
          ? 'bg-emerald-600 text-white border-transparent'
          : 'bg-slate-100 text-slate-700 border-slate-200';
  const Icon =
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
      ? Truck
      : status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN || status === EXPORT_LIFECYCLE_STATUS.PUBLISHED
        ? Lock
        : ShieldOff;
  return (
    <span className={`inline-flex items-center gap-1 h-7 px-2 rounded-full border text-[11px] font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function DashboardToolbar({
  // Konfiguration / Lerntyp-State
  konfiguration,
  activeLernTyp,
  onActiveLernTypChange,
  // Einheit-Freigabe-Daten (aus useEinheitFreigabeStatus)
  einheitFreigabe,
  // Aktiver Pfad
  istPfadGesperrt,
  darfFreigeben,
  darfEntsperren,
  pfadStatusBusy,
  onReleasePath,
  onUnlockPath,
  // Einheit-Final-Release
  onOpenFinalReleaseConfirm,
  onUndoFinalRelease,
  finalReleaseBusy,
  // Guide
  onOpenGuide,
  // Edit-Modus
  isStructuralEditingActive,
  isEndingEdit,
  onEndEditing,
  // Save-Indicator
  saveIcon: SaveIcon,
  saveIconCls,
  saveTitle,
  // Drift
  driftForActiveLerntyp,
  onDriftAddSektor,
  onDriftRemoveSektor,
  onDriftRemoveItem,
  driftDisabled,
}) {
  const status = einheitFreigabe?.status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const lockedCount = einheitFreigabe?.lockedCount ?? 0;
  const dashboards = einheitFreigabe?.dashboards || {};
  const isFinal = einheitFreigabe?.isFinal;
  const canEnterFinal = darfFreigeben && status === EXPORT_LIFECYCLE_STATUS.DRAFT && einheitFreigabe?.allDashboardsLocked;
  const canUndoFinal = darfFreigeben && einheitFreigabe?.canUndoInUnit;

  const lerntypLabel = LERNTYP_META[activeLernTyp]?.label || activeLernTyp;

  return (
    <div className="shrink-0 px-3 py-1.5 border-b border-border bg-card flex items-center gap-2 flex-wrap">
      {/* 1. Einheit-Status */}
      <EinheitStatusBadge status={status} />

      {/* 2. Lerntyp-Pills */}
      <div className="flex items-center gap-1 flex-wrap">
        {LERNTYPEN.map((lt) => (
          <LerntypPill
            key={lt}
            typKey={lt}
            active={activeLernTyp === lt}
            count={(konfiguration?.[lt] || []).length}
            locked={!!dashboards[lt]}
            onClick={() => onActiveLernTypChange?.(lt)}
          />
        ))}
      </div>

      {/* 3. X/4 geprüft */}
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <CheckCircle2 className={`w-3 h-3 ${lockedCount === 4 ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        {lockedCount} / 4 geprüft
      </span>

      {/* 4. Drift-Pill (nur wenn Drift vorhanden) */}
      <DashboardDriftPill
        lerntypReport={driftForActiveLerntyp}
        lerntypLabel={lerntypLabel}
        onAddSektor={onDriftAddSektor}
        onRemoveSektor={onDriftRemoveSektor}
        onRemoveItem={onDriftRemoveItem}
        disabled={driftDisabled}
      />

      {/* 5. Guide */}
      {onOpenGuide && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenGuide}
          className="gap-1.5 h-7 text-[11px] px-2.5"
          title="Didaktische Erklärung & Standard-Raster"
        >
          <BookOpen className="w-3 h-3" />
          Guide
        </Button>
      )}

      {/* 6. Spacer */}
      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
        {/* 7. Aktiver Pfad: Prüfen & freigeben / Entsperren */}
        {!istPfadGesperrt && darfFreigeben && (
          <div className="inline-flex items-center gap-1">
            <Button
              size="sm"
              onClick={onReleasePath}
              disabled={pfadStatusBusy || !isStructuralEditingActive}
              className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
              title={!isStructuralEditingActive ? 'Bitte zuerst Bearbeiten starten' : `„${lerntypLabel}" prüfen und freigeben`}
            >
              {pfadStatusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              Dashboard prüfen & freigeben
            </Button>
            <InfoHint title="Dashboard prüfen & freigeben">
              Validiert den aktuellen Lernpfad „{lerntypLabel}" und gibt ihn anschließend für Schüler frei. Danach ist der Pfad gesperrt.
            </InfoHint>
          </div>
        )}
        {istPfadGesperrt && darfEntsperren && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUnlockPath}
            disabled={pfadStatusBusy}
            className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
            title={`Lernpfad „${lerntypLabel}" entsperren`}
          >
            {pfadStatusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
            Entsperren
          </Button>
        )}

        {/* 8. Einheit final freigeben / aufheben */}
        {status === EXPORT_LIFECYCLE_STATUS.DRAFT && darfFreigeben && (
          <div className="inline-flex items-center gap-1">
            <Button
              size="sm"
              onClick={onOpenFinalReleaseConfirm}
              disabled={!canEnterFinal || finalReleaseBusy}
              className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white border-transparent"
              title={
                !einheitFreigabe?.allDashboardsLocked
                  ? 'Erst möglich, wenn alle 4 Dashboards geprüft sind.'
                  : 'Einheit final freigeben'
              }
            >
              {finalReleaseBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              Einheit final freigeben
            </Button>
            <InfoHint title="Einheit final freigeben">
              Sperrt die Inhalte aller Aufgaben/Pakete. Erst möglich, wenn alle 4 Dashboards geprüft sind.
            </InfoHint>
          </div>
        )}
        {isFinal && darfFreigeben && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUndoFinalRelease}
            disabled={!canUndoFinal || finalReleaseBusy}
            className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
            title="Finale Einheits-Freigabe aufheben"
          >
            {finalReleaseBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
            Freigabe aufheben
          </Button>
        )}

        {/* 9. Bearbeitung beenden */}
        {isStructuralEditingActive && onEndEditing && (
          <Button
            size="sm"
            onClick={onEndEditing}
            disabled={isEndingEdit}
            className="gap-1.5 h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
            title="Bearbeitungsmodus beenden"
          >
            {isEndingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
            Bearbeitung beenden
          </Button>
        )}

        {/* 10. Save-Indicator */}
        {SaveIcon && (
          <span title={saveTitle} className="inline-flex items-center pl-1">
            <SaveIcon className={`w-3.5 h-3.5 ${saveIconCls || ''}`} />
          </span>
        )}
      </div>
    </div>
  );
}