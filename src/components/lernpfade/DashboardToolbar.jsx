/**
 * DashboardToolbar.jsx
 *
 * Konsolidierte zweizeilige Toolbar für Tab 7 „Dashboards".
 *
 * Zeile 1 (Aktionen):
 *   - Einheit-Status-Badge (export_lifecycle_status)
 *   - Drift-Pill (Popover-Overlay)
 *   - Spacer
 *   - „Dashboard prüfen & freigeben" / „Entsperren"
 *   - „Einheit final freigeben" / „Freigabe aufheben"
 *   - „Bearbeitung beenden"
 *   - Save-Indicator
 *
 * Zeile 2 (Reiter):
 *   - 4 Lerntyp-Pills mit Status-Dot (Entwurf/Gesperrt) + Direkthilfe-Icon.
 *     Klick wechselt das aktive Dashboard – das Canvas-Layout darunter
 *     ändert sich entsprechend (reiterähnliche Struktur).
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
  PenLine,
  Sparkles,
  Layers,
  Trophy,
  Star,
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

// ── Lerntyp-Pill: Tab-Switcher + Status-Anzeige + Direkthilfe ──────────────
function LerntypPill({ typKey, active, locked, onClick, onOpenGuide }) {
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
    </div>
  );

  const handleHelpClick = (e) => {
    e.stopPropagation();
    onOpenGuide?.();
  };

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
            {onOpenGuide && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Direkthilfe zu „${meta.label}"`}
                onClick={handleHelpClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleHelpClick(e);
                  }
                }}
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-white/25 hover:bg-white/40 text-white'
                    : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                }`}
                title="Direkthilfe öffnen"
              >
                ?
              </span>
            )}
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
  const dashboards = einheitFreigabe?.dashboards || {};
  const isFinal = einheitFreigabe?.isFinal;
  const canEnterFinal = darfFreigeben && status === EXPORT_LIFECYCLE_STATUS.DRAFT && einheitFreigabe?.allDashboardsLocked;
  const canUndoFinal = darfFreigeben && einheitFreigabe?.canUndoInUnit;

  const lerntypLabel = LERNTYP_META[activeLernTyp]?.label || activeLernTyp;

  return (
    <div className="shrink-0 border-b border-border bg-card">
      {/* Zeile 1: Status, Drift, Aktionen, Save */}
      <div className="px-3 py-1.5 flex items-center gap-2 flex-wrap">
        <EinheitStatusBadge status={status} />

        <DashboardDriftPill
          lerntypReport={driftForActiveLerntyp}
          lerntypLabel={lerntypLabel}
          onAddSektor={onDriftAddSektor}
          onRemoveSektor={onDriftRemoveSektor}
          onRemoveItem={onDriftRemoveItem}
          disabled={driftDisabled}
        />

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Aktiver Pfad: Prüfen & freigeben / Entsperren */}
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

          {/* Einheit final freigeben / aufheben */}
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

          {/* Bearbeitung beenden */}
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

          {/* Save-Indicator */}
          {SaveIcon && (
            <span title={saveTitle} className="inline-flex items-center pl-1">
              <SaveIcon className={`w-3.5 h-3.5 ${saveIconCls || ''}`} />
            </span>
          )}
        </div>
      </div>

      {/* Zeile 2: Reiter-Leiste mit den 4 Lerntyp-Pills */}
      <div className="px-3 py-1.5 border-t border-border/60 bg-muted/30 flex items-center gap-1 flex-wrap">
        {LERNTYPEN.map((lt) => (
          <LerntypPill
            key={lt}
            typKey={lt}
            active={activeLernTyp === lt}
            locked={!!dashboards[lt]}
            onClick={() => onActiveLernTypChange?.(lt)}
            onOpenGuide={onOpenGuide}
          />
        ))}
      </div>
    </div>
  );
}