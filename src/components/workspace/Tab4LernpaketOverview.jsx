/**
 * Tab4LernpaketOverview.jsx
 *
 * Kompakte Lernpaket-Übersicht für Tab 4 (Aufgaben erstellen).
 * Zeigt dieselben Inhalte wie Tab 3 (LernpaketPanel), aber OHNE
 * "Bearbeiten" und "Mit KI füllen" — nur der Freigabe-Button bleibt.
 *
 * Aktivitäten-Zeilen sind anklickbar und navigieren direkt zur Aktivität.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Clock, Target, AlertTriangle, Lock, ArrowRight, CheckCircle2, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLernpaketReleaseReadiness } from '@/hooks/useCompleteness';
import { useCanToggleLernpaketRelease } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';
import { kategorieColors } from '@/components/workspace/panels/SharedUI';

const PHASE_META = {
  'Input':     { icon: '📚', bg: 'bg-green-50 border-green-200' },
  'Übung':     { icon: '✏️', bg: 'bg-pink-50 border-pink-200' },
  'Abschluss': { icon: '🎯', bg: 'bg-blue-50 border-blue-200' },
};

export default function Tab4LernpaketOverview({
  paket,
  einheit = null,
  kannBearbeiten = true,
  onActivitySelect,
}) {
  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const { data: alleAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      sync_status: { $ne: 'to_delete' },
    }),
  });

  const { data: alleMasters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  const paketAktivitaeten = alleAktivitaeten.filter(a => a.lernpaket_id === paket.id);
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);
  const phasenConfig = paket.phasen_konfiguration || {};

  // Release-Logik: Für Tab 4 zählt die bewusste Freigabe der Aktivitäten.
  // Bei Master-Aktivitäten kann `is_complete` trotz freigegebener Master noch
  // verzögert nachziehen; der Button darf deshalb nicht daran hängen bleiben.
  const releaseReadiness = useLernpaketReleaseReadiness(paket, paketAktivitaeten);
  const activePaketAktivitaeten = paketAktivitaeten.filter(
    a => (phasenConfig[a.phase] || {}).disabled !== true
  );
  const allActivitiesReleased = activePaketAktivitaeten.length > 0 && activePaketAktivitaeten.every(
    a => a.content_status === 'approved'
  );
  const canReleasePackage = allActivitiesReleased || releaseReadiness.isComplete;
  const canToggleRelease = useCanToggleLernpaketRelease(paket, einheit);
  const { setReleaseStatus, isPending: isReleasePending } = useSetReleaseStatus();
  const isReleased = paket.content_status === 'approved' && !!paket.released_at;

  const handleRelease = (next) => {
    setReleaseStatus({ targetType: 'lernpaket', targetId: paket.id, release: next });
  };

  const activePhases = ['Input', 'Übung', 'Abschluss'].filter(
    phase => (phasenConfig[phase] || {}).disabled !== true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">{paket.titel_des_pakets}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5" />
            {paket.geschaetzte_dauer_minuten} Minuten
          </p>
        </div>

        {/* Freigabe-Button */}
        {kannBearbeiten && (
          isReleased ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRelease(false)}
              disabled={isReleasePending || !canToggleRelease.allowed}
              title={!canToggleRelease.allowed ? 'Einheit ist final freigegeben — Freigabe gesperrt' : 'Freigabe zurücknehmen'}
              className="gap-2 bg-green-50 border-green-400 text-green-800 hover:bg-green-100"
            >
              {isReleasePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Freigegeben
            </Button>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => canReleasePackage && canToggleRelease.allowed && handleRelease(true)}
                      disabled={!canReleasePackage || !canToggleRelease.allowed || isReleasePending}
                      className="gap-2"
                    >
                      {isReleasePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Lernpaket freigeben
                    </Button>
                  </span>
                </TooltipTrigger>
                {(!canReleasePackage || !canToggleRelease.allowed) && (
                  <TooltipContent side="bottom">
                    {!canToggleRelease.allowed
                      ? 'Einheit ist final freigegeben — Freigabe gesperrt'
                      : 'Lernpaket kann erst freigegeben werden, wenn alle Aktivitäten freigegeben sind.'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        )}
      </div>

      {/* Zugeordnete Lernziele */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Lernziele</h3>
        {paketZiele.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-1">Keine Lernziele zugeordnet.</p>
        ) : (
          <div className="space-y-2">
            {paketZiele.map(lz => (
              <div key={lz.id} className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{lz.formulierung_fachsprache}</p>
                  {lz.schueler_uebersetzung && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">„{lz.schueler_uebersetzung}"</p>
                  )}
                  {lz.kategorie && (
                    <Badge className={`text-[10px] mt-1 ${kategorieColors[lz.kategorie] || ''}`}>
                      {lz.kategorie}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zugeordnete Aktivitäten */}
      <div className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Zugeordnete Aktivitäten</h3>
        {activePhases.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Alle Phasen deaktiviert.</p>
        ) : (
          <div className="space-y-3">
            {activePhases.map(phase => {
              const activities = paketAktivitaeten
                .filter(a => a.phase === phase)
                .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
              const meta = PHASE_META[phase];

              return (
                <div key={phase} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                    <span>{meta.icon}</span>
                    <span>{phase}</span>
                    <span className="text-muted-foreground/60">({activities.length})</span>
                  </p>
                  {activities.length === 0 ? (
                    <div className="p-2.5 rounded border border-dashed border-border text-xs text-muted-foreground italic">
                      Noch keine Aktivität zugeordnet
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                       {activities.map(activity => {
                         const katalogEntry = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
                         const aktivitaetName = katalogEntry?.name || 'Unbekannte Aktivität';
                         const isComplete = activity.is_complete === true;
                         const activityMasters = alleMasters.filter(m => m.activity_id === activity.id);
                         return (
                           <div key={activity.id} className="space-y-1">
                             <button
                               onClick={() => onActivitySelect?.(activity)}
                               className={cn(
                                 'group w-full flex items-center gap-2 p-2 rounded border text-xs text-left hover:ring-1 hover:ring-primary/40 hover:shadow-sm transition-all cursor-pointer',
                                 meta.bg
                               )}
                               title="Aktivität in Tab 4 öffnen"
                             >
                               <span className="text-primary font-semibold shrink-0">▸</span>
                               <span className="flex-1 text-foreground">{aktivitaetName}</span>
                               {activity.content_status === 'approved' ? (
                                 <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                                   <Lock className="w-2.5 h-2.5" />
                                   Freigegeben
                                 </span>
                               ) : isComplete ? (
                                 <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                   Vollständig
                                 </span>
                               ) : (
                                 <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                   <AlertTriangle className="w-2.5 h-2.5" />
                                   Unvollständig
                                 </span>
                               )}
                               <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                             </button>
                             {activityMasters.length > 0 && (
                               <div className="ml-6 space-y-0.5">
                                 {activityMasters.map(master => (
                                   <div key={master.id} className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2 py-1">
                                     <span className="text-primary/60">◆</span>
                                     <span className="text-foreground">{master.titel || 'Master ' + (activityMasters.indexOf(master) + 1)}</span>
                                     {master.content_status === 'approved' && (
                                       <Lock className="w-2.5 h-2.5 text-green-600 shrink-0" />
                                     )}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}