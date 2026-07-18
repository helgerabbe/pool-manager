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
  Eye,
  CheckCircle2,
  RotateCcw,
  Compass,
  Check,
  X,
  Wand2,
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
import CockpitSyncBadge from '@/components/export/CockpitSyncBadge';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, activeBg: 'bg-slate-700', activeText: 'text-white', inactiveText: 'text-slate-700' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, activeBg: 'bg-blue-600', activeText: 'text-white', inactiveText: 'text-blue-700' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, activeBg: 'bg-amber-600', activeText: 'text-white', inactiveText: 'text-amber-700' },
  passioniert: { label: 'Passioniert', icon: Star, activeBg: 'bg-violet-600', activeText: 'text-white', inactiveText: 'text-violet-700' },
};
const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

// ── Lerntyp-Pill: Tab-Switcher + Prüf-/Lebenszyklus-Status + Direkthilfe ────
// Zweizeiliges, etwas höheres Layout: oben Name + Prüf-Status + Direkthilfe,
// unten der Lebenszyklus (Neu / Im Export / Synchron / Geändert). Dadurch ist
// auf Tab 7 jederzeit sichtbar, in welchem Moodle-Sync-Zustand jedes der vier
// Dashboards gerade steckt.
function LerntypPill({ typKey, active, locked, syncStatus, onClick, onOpenGuide, labelOverride }) {
  const baseMeta = LERNTYP_META[typKey];
  const meta = labelOverride ? { ...baseMeta, label: labelOverride } : baseMeta;
  const Icon = meta.icon;

  const tooltip = (
    <div className="max-w-[240px] space-y-1 text-xs leading-snug">
      <p className="font-semibold">{meta.label}</p>
      <p>
        <span className="font-medium">Prüfung:</span> {locked ? 'Als geprüft markiert ✓' : 'Entwurf – noch in Bearbeitung'}
      </p>
      {locked && (
        <p className="text-muted-foreground">
          Dieses Dashboard wurde als fertig markiert. Die Aufgaben bleiben weiterhin bearbeitbar – erst die finale Einheits-Freigabe sperrt alles.
        </p>
      )}
    </div>
  );

  const handleHelpClick = (e) => {
    e.stopPropagation();
    onOpenGuide?.();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all min-w-[150px] ${
        active
          ? `${meta.activeBg} ${meta.activeText} border-transparent shadow-sm`
          : `bg-card ${meta.inactiveText} border-border hover:bg-muted`
      }`}
    >
      {/* Zeile 1: Name (groß) + Direkthilfe rechts oben */}
      <span className="inline-flex items-center gap-1.5 w-full">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm">{meta.label}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-card text-card-foreground border border-border shadow-md p-2.5">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
            className={`ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
              active
                ? 'bg-white/25 hover:bg-white/40 text-white'
                : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
            }`}
            title="Direkthilfe öffnen"
          >
            ?
          </span>
        )}
      </span>

      {/* Zeile 2: grünes Häkchen (Prüf-Status) + Lebenszyklus-Badge */}
      <span className="inline-flex items-center gap-1.5 pointer-events-auto">
        {locked ? (
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-200' : 'text-emerald-600'}`}
          />
        ) : (
          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
        )}
        <CockpitSyncBadge syncStatus={syncStatus || 'new'} />
      </span>
    </button>
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
  // Lebenszyklus pro Dashboard: { [lerntyp]: 'new'|'pending'|'synced'|'modified' }
  dashboardSyncByLerntyp = {},
  // Aktiver Pfad
  istPfadGesperrt,
  darfFreigeben,
  darfEntsperren,
  pfadStatusBusy,
  onReleasePath,
  onUnlockPath,
  // Guide
  onOpenGuide,
  // Schüler-Vorschau
  onOpenPreview,
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
  // Privat-Modus: pro Lerntyp einzeln an-/abschaltbar (nur private Einheiten)
  zeigeLerntypenSchalter = false,
  aktiveLerntypen = LERNTYPEN,
  onToggleLerntyp,
  modusBusy = false,
  lerntypNamen = {},
  // Auto-Assembly: 'auto' | 'bestaetigt' | null für den aktiven Lerntyp.
  autoStatus = null,
  onConfirmAuto,
}) {
  const status = einheitFreigabe?.status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const dashboards = einheitFreigabe?.dashboards || {};

  // Killer-Switch: Sobald die Einheit final freigegeben oder im Export ist,
  // werden ALLE Sektor-Pfad-Aktionen UND alle Dashboard-Reset-Aktionen
  // ausgeblendet. Stattdessen ein klarer Read-Only-Hinweis.
  const isEinheitContentLocked = einheitFreigabe?.isContentLocked === true;
  const isExportRunning = status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING;

  const lerntypLabel = LERNTYP_META[activeLernTyp]?.label || activeLernTyp;
  // Onboarding ist einheits-global, kein Lerntyp-Dashboard → lerntyp-spezifische
  // Aktionen (Prüfen/Freigeben, Schüler-Vorschau, Drift) sind dort nicht sinnvoll.
  const istOnboarding = activeLernTyp === 'onboarding';

  // Privat-Modus: nur die angebotenen Lerntypen als Reiter zeigen. Bei genau
  // EINEM angebotenen Lerntyp entfällt die Lerntyp-Wahl → Onboarding-Pill weg.
  const sichtbareLerntypen = LERNTYPEN.filter((lt) => aktiveLerntypen.includes(lt));
  const zeigeOnboardingPill = !(zeigeLerntypenSchalter && aktiveLerntypen.length === 1);

  return (
    <div className="shrink-0 border-b border-border bg-card">
      {/* Zeile 1: Drift, Aktionen, Save */}
      <div className="px-3 py-1.5 flex items-center gap-2 flex-wrap">
        {!istOnboarding && <DashboardDriftPill
          lerntypReport={driftForActiveLerntyp}
          lerntypLabel={lerntypLabel}
          onAddSektor={onDriftAddSektor}
          onRemoveSektor={onDriftRemoveSektor}
          onRemoveItem={onDriftRemoveItem}
          disabled={driftDisabled}
        />}

        {/* Auto-Assembly: Badge + Übernehmen-Aktion, solange das Dashboard
            automatisch erstellt und noch nicht bestätigt wurde. */}
        {!istOnboarding && autoStatus === 'auto' && (
          <span
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-violet-50 border border-violet-300 text-[11px] text-violet-900 font-medium"
            title="Dieses Dashboard wurde automatisch aus der Einheiten-Struktur und der Standardvorlage aufgebaut und noch nicht bestätigt."
          >
            <Wand2 className="w-3 h-3" />
            Automatisch erstellt
          </span>
        )}
        {!istOnboarding && autoStatus === 'auto' && onConfirmAuto && !isEinheitContentLocked && (
          <Button
            size="sm"
            variant="outline"
            onClick={onConfirmAuto}
            className="gap-1.5 h-7 text-[11px] px-2.5 border-violet-300 text-violet-700 hover:bg-violet-50"
            title="Den automatisch erstellten Aufbau so übernehmen"
          >
            <Check className="w-3 h-3" />
            Übernehmen
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Schüler-Vorschau des aktiven Lerntyp-Dashboards */}
          {!istOnboarding && onOpenPreview && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenPreview}
              className="gap-1.5 h-7 text-[11px] px-2.5 border-blue-300 text-blue-700 hover:bg-blue-50"
              title={`Schüler-Vorschau für „${lerntypLabel}“ öffnen`}
            >
              <Eye className="w-3 h-3" />
              Vorschau
            </Button>
          )}

          {/* ── Killer-Switch: Lifecycle-Lock-Hinweis ────────────────────
              Sobald die Einheit final freigegeben oder im Export ist,
              werden ALLE Sektor-Pfad-Buttons ausgeblendet. Nur die
              „Freigabe aufheben"-Aktion bleibt zugänglich (und nur dann,
              wenn nicht 'export_running'). */}
          {isEinheitContentLocked && (
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-900 font-medium">
              <Lock className="w-3 h-3" />
              {isExportRunning
                ? 'Im Export – alle Bearbeitungen gesperrt'
                : 'Final freigegeben – alle Bearbeitungen gesperrt'}
            </span>
          )}

          {/* Aktiver Pfad: Prüfen & freigeben / Entsperren — NUR sichtbar,
              solange die Einheit nicht final ist. */}
          {!istOnboarding && !isEinheitContentLocked && !istPfadGesperrt && darfFreigeben && (
            <div className="inline-flex items-center gap-1">
              <Button
                size="sm"
                onClick={onReleasePath}
                disabled={pfadStatusBusy || !isStructuralEditingActive}
                className="gap-1.5 h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                title={!isStructuralEditingActive ? 'Bitte zuerst Bearbeiten starten' : `„${lerntypLabel}" als geprüft markieren`}
              >
                {pfadStatusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Dashboard als geprüft markieren
              </Button>
              <InfoHint title="Dashboard als geprüft markieren">
                Markiert den Lernpfad „{lerntypLabel}" als fertig geprüft. Das ist nur ein Status – die Aufgaben bleiben weiterhin bearbeitbar. Erst wenn alle 4 Dashboards geprüft sind und du „Einheit final freigeben" klickst, werden alle Inhalte gesperrt.
              </InfoHint>
            </div>
          )}
          {!istOnboarding && !isEinheitContentLocked && istPfadGesperrt && darfEntsperren && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUnlockPath}
              disabled={pfadStatusBusy}
              className="gap-1.5 h-7 text-[11px] px-2.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              title={`Das Dashboard „${lerntypLabel}" wurde als geprüft markiert – die Aufgaben sind dadurch NICHT gesperrt und können weiter bearbeitet werden. Erst „Einheit final freigeben" sperrt alle Aufgaben, bis der Export abgeschlossen ist. Hier nimmst du nur die Prüf-Markierung zurück.`}
            >
              {pfadStatusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Prüfung zurücknehmen
            </Button>
          )}

          {/* Hinweis: „Einheit final freigeben" / „Freigabe aufheben" sind
              ins Freigabe-Cockpit (Tab 9) umgezogen – dort, wo der
              Gesamtstatus der Einheit sichtbar ist. */}

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

      {/* Zeile 2: Reiter-Leiste – Onboarding-Pill (einheits-global) + 4 Lerntyp-Pills.
          Bei privaten Einheiten steht links der Lerntypen-Schalter; im
          Einzel-Modus gibt es nur EIN Dashboard (Basis: Ehrgeizig-Pfad). */}
      <div className="px-3 py-1.5 border-t border-border/60 bg-muted/30 flex items-center gap-1 flex-wrap">
        {zeigeLerntypenSchalter && (
          <div className="flex flex-col justify-center gap-1 pr-3 mr-2 border-r border-border self-stretch">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Angebotene Lerntypen
            </span>
            <div className="flex items-center gap-1">
              {LERNTYPEN.map((lt) => {
                const an = aktiveLerntypen.includes(lt);
                const name = lerntypNamen[lt] || LERNTYP_META[lt].label;
                return (
                  <button
                    key={lt}
                    type="button"
                    disabled={modusBusy}
                    onClick={() => onToggleLerntyp?.(lt)}
                    title={an ? `„${name}" für diese Einheit deaktivieren` : `„${name}" für diese Einheit aktivieren`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                      an
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-muted border-border text-muted-foreground opacity-70 hover:opacity-100'
                    }`}
                  >
                    {an ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {zeigeOnboardingPill && (
        <>
        <button
          type="button"
          onClick={() => onActiveLernTypChange?.('onboarding')}
          className={`flex flex-col items-start gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold transition-all min-w-[150px] ${
            activeLernTyp === 'onboarding'
              ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
              : 'bg-card text-primary border-border hover:bg-muted'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 w-full">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-sm">Onboarding</span>
          </span>
          <span className="text-[10px] font-medium opacity-80">Vor den Dashboards</span>
        </button>
        <span className="w-px h-9 bg-border mx-1 self-center" />
        </>
        )}
        {sichtbareLerntypen.map((lt) => (
          <LerntypPill
            key={lt}
            typKey={lt}
            active={activeLernTyp === lt}
            locked={!!dashboards[lt]}
            syncStatus={dashboardSyncByLerntyp[lt]}
            onClick={() => onActiveLernTypChange?.(lt)}
            onOpenGuide={onOpenGuide}
            labelOverride={lerntypNamen[lt]}
          />
        ))}
      </div>
    </div>
  );
}