/**
 * TaskCreationView.jsx
 *
 * Tab 4: Aufgaben erstellen – strikte Master-Detail-Logik
 *
 * Sidebar:  Lernpakete = aufklappbare Ordner
 *           → Aktivitäten = wählbare Blätter (Master)
 *             → Klone = eingerückt unter der Aktivität
 * Hauptbereich:
 *   - leer       → EmptyState
 *   - Aktivität  → MasterActivityPanel
 *   - Klon       → KlonDetailView
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Package, MousePointerClick, AlertTriangle, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MasterActivityPanel from '@/components/workspace/MasterActivityPanel';
import KlonDetailView from '@/components/workspace/KlonDetailView';
import { isActivityLockedByOther, isLockExpired } from '@/hooks/useActivityLock';
import { cn } from '@/lib/utils';

const PHASES = [
  { key: 'Input',     label: 'Input',     icon: '📚' },
  { key: 'Übung',     label: 'Übung',     icon: '✏️' },
  { key: 'Abschluss', label: 'Abschluss', icon: '🎯' },
];

// ── Klon-Unterzeile ───────────────────────────────────────────────────────────

function KlonSubItem({ klon, isSelected, onSelect }) {
  const label = klon.status === 'approved'
    ? <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">✓ Freigegeben</Badge>
    : <Badge variant="secondary" className="text-[10px]">Entwurf {klon.klon_index || '?'}</Badge>;

  return (
    <button
      onClick={() => onSelect({ type: 'klon', klon })}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[11px] transition-colors',
        isSelected
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <span className="flex-1 truncate">
        {klon.status === 'approved' ? '✓' : '○'} Klon {klon.klon_index || '?'}
      </span>
      {label}
    </button>
  );
}

// ── Sidebar: Aktivitäts-Zeile (mit eingerückten Klonen) ───────────────────────

function ActivitySidebarItem({ activity, aktivitaetName, klone, selectedItem, onSelect, isIncomplete, myEmail }) {
  const isActivitySelected = selectedItem?.type === 'activity' && selectedItem?.activity?.id === activity.id;
  const hasSelectedKlon = klone.some(k => selectedItem?.type === 'klon' && selectedItem?.klon?.id === k.id);
  const lockedByOther = isActivityLockedByOther(activity, myEmail);

  return (
    <div>
      <button
        onClick={() => onSelect({ type: 'activity', activity })}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
          isActivitySelected
            ? 'bg-primary text-primary-foreground font-medium'
            : isIncomplete
              ? 'text-amber-700 bg-amber-50/60 hover:bg-amber-100'
              : 'text-foreground hover:bg-muted'
        )}
      >
        <span className="flex-1 truncate">{aktivitaetName}</span>
        {lockedByOther && !isActivitySelected && (
          <Lock className="w-3 h-3 text-amber-500 shrink-0" title={`Gesperrt von ${activity.locked_by_user}`} />
        )}
        {isIncomplete && !isActivitySelected && !lockedByOther && (
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Inhalt unvollständig" />
        )}
        {klone.length > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
            {klone.length}
          </span>
        )}
      </button>

      {/* Klone eingerückt */}
      {(isActivitySelected || hasSelectedKlon) && klone.length > 0 && (
        <div className="ml-4 mt-0.5 border-l border-border pl-2 space-y-0.5">
          {klone.map(klon => (
            <KlonSubItem
              key={klon.id}
              klon={klon}
              isSelected={selectedItem?.type === 'klon' && selectedItem?.klon?.id === klon.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Lernpaket-Ordner ─────────────────────────────────────────────────

function SidebarLernpaketFolder({
  lernpaket,
  allActivities,
  aktivitaetenMap,
  klonenByActivityId,
  selectedItem,
  onSelect,
  defaultOpen = false,
  myEmail,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const paketActivities = allActivities.filter(a => a.lernpaket_id === lernpaket.id);
  const phasenConfig = lernpaket.phasen_konfiguration || {};

  const hasSelectedChild =
    (selectedItem?.type === 'activity' && paketActivities.some(a => a.id === selectedItem.activity?.id)) ||
    (selectedItem?.type === 'klon' && paketActivities.some(a => (klonenByActivityId[a.id] || []).some(k => k.id === selectedItem.klon?.id)));

  useEffect(() => {
    if (hasSelectedChild) setOpen(true);
  }, [hasSelectedChild]);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <Package className="w-4 h-4 shrink-0 text-amber-500" />
        <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{paketActivities.length}</span>
      </button>

      {open && (
        <div className="ml-5 mt-0.5 border-l border-border pl-2 space-y-2 pb-1">
          {paketActivities.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground/50 italic">Keine Aktivitäten zugeordnet</p>
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
                  <div className="space-y-0.5">
                    {phaseActs.map(activity => (
                      <ActivitySidebarItem
                        key={activity.id}
                        activity={activity}
                        aktivitaetName={aktivitaetenMap[activity.aktivitaet_id] || '…'}
                        klone={klonenByActivityId[activity.id] || []}
                        selectedItem={selectedItem}
                        onSelect={onSelect}
                        isIncomplete={!activity.is_complete}
                        myEmail={myEmail}
                      />
                    ))}
                  </div>
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
    <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <MousePointerClick className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-semibold text-muted-foreground">Aktivität auswählen</p>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
          Bitte wähle links eine Aktivität aus, um deren Aufgaben zu bearbeiten.
        </p>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function TaskCreationView({ einheitId, kannBearbeiten, userEmail }) {
  const queryClient = useQueryClient();
  // selectedItem = null | { type: 'activity', activity } | { type: 'klon', klon }
  const [selectedItem, setSelectedItem] = useState(null);

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

  const { data: alleKlone = [] } = useQuery({
    queryKey: ['aufgabenbausteine', 'klone', einheitId],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
    enabled: !!einheitId,
  });

  const aktivitaetenMap = Object.fromEntries(aktivitaetenKatalog.map(a => [a.id, a.name]));

  // Klone gruppiert nach master_activity_id
  const klonenByActivityId = alleKlone.reduce((acc, k) => {
    const key = k.master_activity_id;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(k);
    return acc;
  }, {});
  // Sortierung nach klon_index
  Object.values(klonenByActivityId).forEach(arr => arr.sort((a, b) => (a.klon_index || 0) - (b.klon_index || 0)));

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Selektiertes Objekt bei Daten-Updates synchronisieren
  useEffect(() => {
    if (selectedItem?.type === 'activity') {
      const updated = allActivities.find(a => a.id === selectedItem.activity.id);
      if (updated) setSelectedItem({ type: 'activity', activity: updated });
    }
    if (selectedItem?.type === 'klon') {
      const updated = alleKlone.find(k => k.id === selectedItem.klon.id);
      if (updated) setSelectedItem({ type: 'klon', klon: updated });
    }
  }, [allActivities, alleKlone]);

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

  // Catalog-Entry für selektierte Aktivität
  const selectedCatalog = selectedItem?.type === 'activity'
    ? aktivitaetenKatalog.find(c => c.id === selectedItem.activity.aktivitaet_id)
    : null;

  // supports_master: Flag aus dem Katalog-Eintrag (default: false für Input-Aktivitäten)
  const supportsMaster = selectedCatalog?.supports_master === true;

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
                    klonenByActivityId={klonenByActivityId}
                    selectedItem={selectedItem}
                    onSelect={setSelectedItem}
                    defaultOpen={idx === 0}
                    myEmail={userEmail}
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
        {!selectedItem && <EmptyState />}

        {selectedItem?.type === 'activity' && (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <MasterActivityPanel
              key={selectedItem.activity.id}
              activityRecord={selectedItem.activity}
              catalogEntry={selectedCatalog}
              supportsMaster={supportsMaster}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
              onKlonesCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone', einheitId] });
              }}
            />
          </div>
        )}

        {selectedItem?.type === 'klon' && (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <KlonDetailView
              key={selectedItem.klon.id}
              klon={selectedItem.klon}
              kannBearbeiten={kannBearbeiten}
              userEmail={userEmail}
            />
          </div>
        )}
      </main>

    </div>
  );
}