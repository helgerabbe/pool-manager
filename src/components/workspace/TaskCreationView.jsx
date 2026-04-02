/**
 * TaskCreationView.jsx
 *
 * Tab 4: Aufgaben erstellen
 * Zeigt pro Lernpaket die drei Lernphasen (Input / Übung / Abschluss)
 * mit ihren zugeordneten Aktivitäten (LernpaketPhaseAktivitaet).
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight, Package, Wand2 } from 'lucide-react';
import PhaseActivitiesList from '@/components/workspace/PhaseActivitiesList';
import ActivityDetailView from '@/components/workspace/ActivityDetailView';
import { cn } from '@/lib/utils';

const PHASES = [
  { key: 'Input',     label: 'Input (Erarbeitung)', icon: '📚' },
  { key: 'Übung',     label: 'Übung',               icon: '✏️' },
  { key: 'Abschluss', label: 'Abschluss',            icon: '🎯' },
];

// ── Sidebar-Item ──────────────────────────────────────────────────────────────

function SidebarLernpaketItem({ lernpaket, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(lernpaket)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors',
        isSelected
          ? 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-muted text-foreground'
      )}
    >
      <Package className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ── Hauptbereich: Phasen-Ansicht ──────────────────────────────────────────────

function LernpaketPhasenView({ lernpaket, kannBearbeiten, queryClient }) {
  const [editingActivity, setEditingActivity] = useState(null); // { id }

  const phasenConfig = lernpaket.phasen_konfiguration || {};

  if (editingActivity) {
    const { data: activityRecord } = { data: null }; // wird in ActivityDetailView selbst geladen
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => setEditingActivity(null)}
        >
          ← Zurück
        </Button>
        <ActivityDetailViewWrapper
          activityRecordId={editingActivity.id}
          kannBearbeiten={kannBearbeiten}
          queryClient={queryClient}
          onBack={() => setEditingActivity(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{lernpaket.titel_des_pakets}</h2>
        {lernpaket.geschaetzte_dauer_minuten && (
          <p className="text-sm text-muted-foreground mt-1">
            ⏱ {lernpaket.geschaetzte_dauer_minuten} Minuten
          </p>
        )}
      </div>

      {PHASES.map((phase) => {
        const phaseConfig = phasenConfig[phase.key] || {};
        const isDisabled = phaseConfig.disabled === true;

        return (
          <div key={phase.key} className={cn('space-y-2', isDisabled && 'opacity-40')}>
            <div className="flex items-center gap-2">
              <span className="text-base">{phase.icon}</span>
              <h3 className="text-sm font-semibold">{phase.label}</h3>
              {isDisabled && (
                <span className="text-xs text-muted-foreground italic">(deaktiviert)</span>
              )}
            </div>

            {!isDisabled && (
              <div className="pl-6">
                <PhaseActivitiesList
                  paket={lernpaket}
                  phase={phase.key}
                  kannBearbeiten={kannBearbeiten}
                  onSelectActivity={(data) => setEditingActivity({ id: data.activityId })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Wrapper, der ActivityDetailView mit der Record-ID lädt
function ActivityDetailViewWrapper({ activityRecordId, kannBearbeiten, queryClient, onBack }) {
  const { data: record } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaetRecord', activityRecordId],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({ id: activityRecordId })
      .then(res => res[0] || null),
    enabled: !!activityRecordId,
  });

  if (!record) return <p className="text-sm text-muted-foreground">Lädt…</p>;

  return (
    <ActivityDetailView
      activityRecord={record}
      kannBearbeiten={kannBearbeiten}
      queryClient={queryClient}
    />
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function TaskCreationView({ einheitId, einheit, initialActivityId, kannBearbeiten }) {
  const queryClient = useQueryClient();
  const [selectedPaket, setSelectedPaket] = useState(null);

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

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Auto-select erstes Paket
  useEffect(() => {
    if (paketeFuerEinheit.length > 0 && !selectedPaket) {
      setSelectedPaket(paketeFuerEinheit[0]);
    }
  }, [paketeFuerEinheit.length]);

  // Wenn sich die Lernpakete aktualisieren, selectedPaket auch aktualisieren
  useEffect(() => {
    if (selectedPaket) {
      const updated = paketeFuerEinheit.find(p => p.id === selectedPaket.id);
      if (updated) setSelectedPaket(updated);
    }
  }, [lernpakete]);

  // Gruppiert nach Themenfeld
  const groupedPakete = themenfelder.length > 0
    ? [
        ...themenfelder.map(tf => ({
          label: tf.titel,
          pakete: paketeFuerEinheit.filter(p => p.themenfeld_id === tf.id),
        })).filter(g => g.pakete.length > 0),
        {
          label: 'Nicht zugeordnet',
          pakete: paketeFuerEinheit.filter(p => !p.themenfeld_id),
          isRest: true,
        },
      ].filter(g => g.pakete.length > 0)
    : [{ label: null, pakete: paketeFuerEinheit }];

  return (
    <div className="flex flex-row flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Lernpakete
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {groupedPakete.map(({ label, pakete, isRest }) => (
            <div key={label || 'all'}>
              {label && (
                <p className={cn(
                  'text-[10px] font-bold uppercase tracking-wide px-3 py-1',
                  isRest ? 'text-muted-foreground/50' : 'text-amber-700'
                )}>
                  {label}
                </p>
              )}
              {pakete.map(lernpaket => (
                <SidebarLernpaketItem
                  key={lernpaket.id}
                  lernpaket={lernpaket}
                  isSelected={selectedPaket?.id === lernpaket.id}
                  onSelect={setSelectedPaket}
                />
              ))}
            </div>
          ))}
          {paketeFuerEinheit.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">
              Noch keine Lernpakete. Lege zuerst eine Struktur im Struktur-Tab an.
            </p>
          )}
        </div>
      </aside>

      {/* Hauptbereich */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {selectedPaket ? (
            <LernpaketPhasenView
              key={selectedPaket.id}
              lernpaket={selectedPaket}
              kannBearbeiten={kannBearbeiten}
              queryClient={queryClient}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Wand2 className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">Lernpaket auswählen</p>
              <p className="text-sm text-muted-foreground/70">
                Wähle links ein Lernpaket, um die Aktivitäten zu sehen.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}