/**
 * TaskCreationView.jsx
 *
 * Tab 4: Aufgaben erstellen – strikte Master-Detail-Logik
 *
 * Sidebar:  Lernpakete = aufklappbare Ordner → Aktivitäten = wählbare Blätter
 * Hauptbereich: leer bis eine Aktivität gewählt wird, dann ActivityDetailView
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Package, MousePointerClick, AlertTriangle } from 'lucide-react';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import { cn } from '@/lib/utils';

const PHASES = [
  { key: 'Input',     label: 'Input',     icon: '📚' },
  { key: 'Übung',     label: 'Übung',     icon: '✏️' },
  { key: 'Abschluss', label: 'Abschluss', icon: '🎯' },
];

// ── Sidebar: Lernpaket-Ordner mit aufklappbaren Aktivitäten ───────────────────

function SidebarLernpaketFolder({
  lernpaket,
  allActivities,
  aktivitaetenMap,
  selectedActivityId,
  onSelectActivity,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const paketActivities = allActivities.filter(a => a.lernpaket_id === lernpaket.id);
  const phasenConfig = lernpaket.phasen_konfiguration || {};

  const hasSelected = paketActivities.some(a => a.id === selectedActivityId);

  // Auto-expand wenn eine Aktivität darin selektiert ist
  useEffect(() => {
    if (hasSelected) setOpen(true);
  }, [hasSelected]);

  return (
    <div>
      {/* Ordner-Header – klappt nur auf/zu, selektiert nichts */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <Package className="w-4 h-4 shrink-0 text-amber-500" />
        <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{paketActivities.length}</span>
      </button>

      {/* Aktivitäten-Liste gruppiert nach Phase */}
      {open && (
        <div className="ml-5 mt-0.5 border-l border-border pl-2 space-y-2 pb-1">
          {paketActivities.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground/50 italic">
              Keine Aktivitäten zugeordnet
            </p>
          ) : (
            PHASES.map(phase => {
              const phaseConfig = phasenConfig[phase.key] || {};
              if (phaseConfig.disabled) return null;

              const phaseActs = paketActivities
                .filter(a => a.phase === phase.key)
                .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

              if (phaseActs.length === 0) return null;

              return (
                <div key={phase.key}>
                  <p className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
                    {phase.icon} {phase.label}
                  </p>
                  {phaseActs.map(activity => {
                    const isSelected = activity.id === selectedActivityId;
                    const isIncomplete = !activity.is_complete;
                    return (
                      <button
                        key={activity.id}
                        onClick={() => onSelectActivity(activity)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground font-medium'
                            : isIncomplete
                              ? 'text-amber-700 bg-amber-50/60 hover:bg-amber-100'
                              : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <span className="flex-1 truncate">
                          {aktivitaetenMap[activity.aktivitaet_id] || '…'}
                        </span>
                        {isIncomplete && !isSelected && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Inhalt unvollständig" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-3 text-muted-foreground">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <MousePointerClick className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-semibold">Aktivität auswählen</p>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
          Bitte wähle links eine Aktivität aus, um deren Aufgaben zu bearbeiten.
        </p>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function TaskCreationView({ einheitId, kannBearbeiten }) {
  const queryClient = useQueryClient();
  // selectedActivity = vollständiges LernpaketPhaseAktivitaet-Objekt oder null
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: allActivities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    enabled: !!einheitId,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const aktivitaetenMap = Object.fromEntries(aktivitaetenKatalog.map(a => [a.id, a.name]));

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Wenn die selektierte Aktivität in den neuen Daten enthalten ist, aktualisieren
  useEffect(() => {
    if (selectedActivity) {
      const updated = allActivities.find(a => a.id === selectedActivity.id);
      if (updated) setSelectedActivity(updated);
    }
  }, [allActivities]);

  // Gruppiert nach Themenfeld
  const groupedPakete = themenfelder.length > 0
    ? [
        ...themenfelder
          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
          .map(tf => ({
            label: tf.titel,
            pakete: paketeFuerEinheit.filter(p => p.themenfeld_id === tf.id),
          }))
          .filter(g => g.pakete.length > 0),
        {
          label: 'Nicht zugeordnet',
          pakete: paketeFuerEinheit.filter(p => !p.themenfeld_id),
          isRest: true,
        },
      ].filter(g => g.pakete.length > 0)
    : [{ label: null, pakete: paketeFuerEinheit }];

  return (
    <div className="flex flex-row flex-1 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Aktivitäten
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {groupedPakete.map(({ label, pakete, isRest }) => (
            <div key={label || 'all'}>
              {label && (
                <p className={cn(
                  'text-[10px] font-bold uppercase tracking-wide px-2 py-1',
                  isRest ? 'text-muted-foreground/40' : 'text-amber-700'
                )}>
                  {label}
                </p>
              )}
              <div className="space-y-0.5">
                {pakete.map((lernpaket, idx) => (
                  <SidebarLernpaketFolder
                    key={lernpaket.id}
                    lernpaket={lernpaket}
                    allActivities={allActivities}
                    aktivitaetenMap={aktivitaetenMap}
                    selectedActivityId={selectedActivity?.id}
                    onSelectActivity={setSelectedActivity}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>
            </div>
          ))}
          {paketeFuerEinheit.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              Noch keine Lernpakete vorhanden.
            </p>
          )}
        </div>
      </aside>

      {/* ── Hauptbereich ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {selectedActivity ? (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <ActivityDetailView
              key={selectedActivity.id}
              activityRecord={selectedActivity}
              kannBearbeiten={kannBearbeiten}
              queryClient={queryClient}
            />
          </div>
        ) : (
          <EmptyState />
        )}
      </main>

    </div>
  );
}