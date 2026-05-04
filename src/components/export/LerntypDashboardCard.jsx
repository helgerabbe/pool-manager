/**
 * LerntypDashboardCard.jsx
 *
 * Phase F.2 — Eine kompakte „Steuerungszentrale" pro Lerntyp im
 * Freigabe-Cockpit (Tab 8). Aggregiert für die Fachschaftsleitung in einem
 * einzigen Blick:
 *   - Pfad-Status (LOCKED / DRAFT / EMPTY) als Badge.
 *   - Drift-Aggregation: „X von Y Sektoren geändert" — klickbar, springt
 *     in Tab 7 direkt zum ersten driftenden Sektor.
 *   - Sektor-Grid: jeder Sektor mit Status-Punkt (drifted / clean /
 *     never_locked) — klickbar, scrollt direkt zum Sektor in Tab 7.
 *   - Primär-Button „Im Architekt öffnen" → Tab 7 mit `?lerntyp=`.
 *
 * Diese Komponente ist reines Display & Routing-Trigger. Sie ändert weder
 * State noch DB; sie ruft `onOpenInArchitekt` mit Lerntyp + optionaler
 * Sektor-ID, der Workspace übernimmt den Tab-Wechsel.
 */

import React, { useMemo } from 'react';
import {
  Sparkles,
  Layers,
  Trophy,
  Star,
  Lock,
  Pencil,
  Circle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLernpfadStatus } from '@/hooks/useLernpfadStatus';
import { useLernpfadDriftReport } from '@/hooks/useLernpfadDriftReport';
import { PFAD_STATUS } from '@/lib/pfadStatus';

// Visuelle Identität pro Lerntyp — gleiches Schema wie im
// `LernpfadeArchitekt`, damit das mentale Modell konsistent bleibt.
const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, accent: 'text-slate-600 bg-slate-50 border-slate-200' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, accent: 'text-blue-700 bg-blue-50 border-blue-200' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, accent: 'text-amber-700 bg-amber-50 border-amber-200' },
  passioniert: { label: 'Passioniert', icon: Star, accent: 'text-violet-700 bg-violet-50 border-violet-200' },
};

// Pfad-Status → Badge.
function PfadStatusBadge({ status }) {
  if (status === PFAD_STATUS.LOCKED) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
        <Lock className="w-3 h-3" /> Geprüft
      </span>
    );
  }
  if (status === PFAD_STATUS.DRAFT) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
        <Pencil className="w-3 h-3" /> Editierbar
      </span>
    );
  }
  // EMPTY → noch nicht geprüft.
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
      <Circle className="w-3 h-3" /> Noch nicht geprüft
    </span>
  );
}

// Sektor-Punkt im Mini-Grid: Farbe nach driftStatus.
const DOT_META = {
  drifted: 'bg-orange-500 border-orange-600',
  clean: 'bg-emerald-500 border-emerald-600',
  never_locked: 'bg-slate-300 border-slate-400',
  unknown: 'bg-slate-200 border-slate-300',
  loading: 'bg-slate-200 border-slate-300 animate-pulse',
};

export default function LerntypDashboardCard({
  lerntyp,
  einheitId,
  konfiguration,
  onOpenInArchitekt,
}) {
  const meta = LERNTYP_META[lerntyp] || LERNTYP_META.pragmatiker;
  const Icon = meta.icon;

  const sektoren = useMemo(
    () => (Array.isArray(konfiguration?.[lerntyp]) ? konfiguration[lerntyp] : []),
    [konfiguration, lerntyp]
  );

  // Pfad-Status (locked/draft/empty) und Drift-Report kommen direkt aus
  // den vorhandenen Hooks — beide cachen via React Query, also kein
  // doppelter Roundtrip pro Karte.
  const { data: pfadStatusData } = useLernpfadStatus(einheitId, lerntyp);
  const pfadStatus = pfadStatusData?.status || PFAD_STATUS.EMPTY;

  const { isLoading: driftLoading, getStatus } = useLernpfadDriftReport(einheitId);

  // Drift-Aggregation: zähle gedriftete Sektoren.
  const { driftedCount, totalSektoren, firstDriftedSektorId } = useMemo(() => {
    let drifted = 0;
    let firstId = null;
    for (const s of sektoren) {
      const st = getStatus(lerntyp, s.sektor_id);
      if (st === 'drifted') {
        drifted += 1;
        if (!firstId) firstId = s.sektor_id;
      }
    }
    return { driftedCount: drifted, totalSektoren: sektoren.length, firstDriftedSektorId: firstId };
  }, [sektoren, lerntyp, getStatus]);

  const handleOpen = (sektorId = null) => {
    onOpenInArchitekt?.(lerntyp, sektorId);
  };

  const showDrift = !driftLoading && driftedCount > 0;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${meta.accent}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold truncate">{meta.label}</h3>
            <PfadStatusBadge status={pfadStatus} />
          </div>
          <p className="text-[11px] opacity-70 mt-0.5">
            {totalSektoren === 0
              ? 'Noch keine Sektoren angelegt.'
              : `${totalSektoren} ${totalSektoren === 1 ? 'Sektor' : 'Sektoren'}`}
          </p>
        </div>
      </div>

      {/* Drift-Aggregation */}
      {showDrift && (
        <button
          type="button"
          onClick={() => handleOpen(firstDriftedSektorId)}
          className="flex items-center gap-2 text-[12px] font-semibold rounded-lg border border-orange-300 bg-white/70 text-orange-800 px-2.5 py-1.5 hover:bg-orange-50 transition-colors"
          title="Zum ersten geänderten Sektor in Tab 7 springen"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">
            {driftedCount} von {totalSektoren} Sektoren geändert seit Freigabe
          </span>
          <ArrowRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      )}

      {/* Sektoren-Grid: jeder Sektor klickbar mit Tooltip */}
      {totalSektoren > 0 && (
        <TooltipProvider delayDuration={120}>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {sektoren.map((s, idx) => {
              const status = driftLoading ? 'loading' : getStatus(lerntyp, s.sektor_id);
              const dotCls = DOT_META[status] || DOT_META.unknown;
              const titel = s.titel_snapshot || s.titel || `Sektor ${idx + 1}`;
              const tooltipText =
                status === 'drifted'
                  ? `${titel} – Geändert seit Freigabe`
                  : status === 'clean'
                  ? `${titel} – Unverändert seit Freigabe`
                  : status === 'never_locked'
                  ? `${titel} – Noch nicht geprüft`
                  : titel;
              return (
                <Tooltip key={s.sektor_id || idx}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleOpen(s.sektor_id)}
                      className={`group flex items-center gap-1 text-[10px] font-medium rounded border bg-white/80 px-1.5 py-0.5 hover:bg-white transition-colors max-w-[140px]`}
                    >
                      <span className={`w-2 h-2 rounded-full border ${dotCls}`} />
                      <span className="truncate">{titel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tooltipText}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Footer-Aktion */}
      <div className="pt-1 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpen()}
          className="w-full justify-between bg-white/70"
        >
          <span>Im Architekt öffnen</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}