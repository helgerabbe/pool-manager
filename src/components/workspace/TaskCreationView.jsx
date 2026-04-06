/**
 * TaskCreationView.jsx – Tab 4: Aufgaben erstellen
 *
 * Datenmodell (1:n):
 *   Aktivität
 *     └─ MasterAufgabe 1  (entity: MasterAufgabe, FK: activity_id)
 *          └─ Klon A      (entity: Aufgabenbausteine, FK: master_aufgabe_id)
 *          └─ Klon B
 *     └─ MasterAufgabe 2
 *          └─ Klon C
 *
 * Sidebar-Baum:
 *   [Lernpaket]
 *     [Phase]
 *       Aktivität
 *         ↳ Master 1
 *            ○ Klon A
 *            ○ Klon B
 *         ↳ Master 2
 *            ○ Klon C
 *
 * Hauptbereich:
 *   - Nichts gewählt    → EmptyState
 *   - Aktivität gewählt → ActivityMasterPanel
 *   - Klon gewählt      → KlonDetailView
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Package, MousePointerClick, AlertTriangle, Lock, Crown, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ActivityMasterPanel from '@/components/workspace/ActivityMasterPanel';
import KlonDetailView from '@/components/workspace/KlonDetailView';
import { isActivityLockedByOther, isLockExpired } from '@/hooks/useActivityLock';
import { cn } from '@/lib/utils';

const PHASES = [
  { key: 'Input',     label: 'Input',     icon: '📚' },
  { key: 'Übung',     label: 'Übung',     icon: '✏️' },
  { key: 'Abschluss', label: 'Abschluss', icon: '🎯' },
];

function isKlonLockedByOther(klon, myEmail) {
  if (!klon?.lock_status) return false;
  if (klon.locked_by_user === myEmail) return false;
  if (isLockExpired(klon.locked_at)) return false;
  return true;
}

// ── Klon-Unterzeile ───────────────────────────────────────────────────────────

function KlonSubItem({ klon, isSelected, onSelect, index }) {
  const isApproved = klon.sync_status === 'approved';
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
        {isApproved ? '✓' : '○'} Kopie {index}
      </span>
      {isApproved
        ? <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">✓ Export</Badge>
        : <Badge variant="secondary" className="text-[10px]">Entwurf</Badge>}
    </button>
  );
}

// ── Master-Unterzeile (mit eingerückten Klonen, einklappbar) ───────────────────────────────

function MasterSubItem({ master, index, klone, selectedItem, onSelect, catalogEntry }) {
  const isMasterSelected = selectedItem?.type === 'master' && selectedItem?.master?.id === master.id;
  const hasSelectedKlon = klone.some(k => selectedItem?.type === 'klon' && selectedItem?.klon?.id === k.id);
  const [expanded, setExpanded] = useState(isMasterSelected || hasSelectedKlon);

  // Auto-expand wenn Master oder Klon selektiert wird
  useEffect(() => {
    if (isMasterSelected || hasSelectedKlon) {
      setExpanded(true);
    }
  }, [isMasterSelected, hasSelectedKlon]);

  const isKITutor = catalogEntry?.name?.toLowerCase().includes('ki-tutor');

  return (
    <div>
      <div className="flex items-center gap-0.5">
        {/* Expand-Button (für KI-Tutor und Masters mit Klonen) */}
        {isKITutor || klone.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
            title={expanded ? 'Einklappen' : 'Aufklappen'}
          >
            <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <div className="w-4" /> /* Spacer für Alignment */
        )}
        
        <button
          onClick={() => onSelect({ type: 'master', master })}
          className={cn(
            'flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[11px] transition-colors',
            isMasterSelected
              ? 'bg-primary/15 text-primary font-semibold'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <Crown className="w-3 h-3 shrink-0 text-primary/70" />
          <span className="flex-1 truncate">{master.titel || `Master ${index}`}</span>
          {master.content_status === 'approved' && (
            <CheckCircle2 className="w-3 h-3 shrink-0 text-green-600" title="Fertig" />
          )}
          {klone.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded shrink-0">
              {klone.length}
            </span>
          )}
        </button>
      </div>

      {/* Expandierte Klone oder Inhalts-Preview für KI-Tutor */}
      {expanded && (
        <div className="ml-4 mt-0.5 border-l border-border pl-2 space-y-0.5">
          {klone.length > 0 ? (
            klone.map((klon, idx) => (
              <KlonSubItem
                key={klon.id}
                klon={klon}
                index={idx + 1}
                isSelected={selectedItem?.type === 'klon' && selectedItem?.klon?.id === klon.id}
                onSelect={onSelect}
              />
            ))
          ) : isKITutor ? (
            <p className="px-2 py-1 text-[10px] text-muted-foreground/60 italic">Keine Klone (KI-Tutor-Aufgabe)</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Aktivitäts-Zeile ─────────────────────────────────────────────────

function ActivitySidebarItem({
  activity, aktivitaetName, masterAufgaben, kloneByMasterId,
  selectedItem, onSelect, isIncomplete, myEmail, catalogEntry,
}) {
  const isActivitySelected = selectedItem?.type === 'activity' && selectedItem?.activity?.id === activity.id;
  const hasSelectedDescendant =
    masterAufgaben.some(m =>
      (selectedItem?.type === 'master' && selectedItem?.master?.id === m.id) ||
      (selectedItem?.type === 'klon' && (kloneByMasterId[m.id] || []).some(k => k.id === selectedItem?.klon?.id))
    );
  const lockedByOther = isActivityLockedByOther(activity, myEmail);
  const showChildren = isActivitySelected || hasSelectedDescendant;

  return (
    <div>
      <button
        id={`activity-node-${activity.id}`}
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
        {masterAufgaben.length > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
            {masterAufgaben.length}M
          </span>
        )}
      </button>

      {/* Master-Knoten + deren Klone — immer sichtbar, wenn Master-Aufgaben existieren */}
      {masterAufgaben.length > 0 && (
        <div className="ml-4 mt-0.5 border-l border-border pl-2 space-y-0.5">
          {masterAufgaben.map((master, idx) => (
            <MasterSubItem
              key={master.id}
              master={master}
              index={idx + 1}
              klone={kloneByMasterId[master.id] || []}
              selectedItem={selectedItem}
              onSelect={onSelect}
              catalogEntry={catalogEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar: Lernpaket-Ordner ─────────────────────────────────────────────────

function SidebarLernpaketFolder({
  lernpaket, allActivities, aktivitaetenMap,
  masterAufgabenByActivityId, kloneByMasterId,
  selectedItem, onSelect, defaultOpen = false, myEmail, isOpen = false, onToggleOpen, aktivitaetenKatalog,
}) {
  const paketActivities = allActivities.filter(a => a.lernpaket_id === lernpaket.id);
  const phasenConfig = lernpaket.phasen_konfiguration || {};

  const hasSelectedChild = paketActivities.some(a => {
    if (selectedItem?.type === 'activity' && selectedItem?.activity?.id === a.id) return true;
    const masters = masterAufgabenByActivityId[a.id] || [];
    return masters.some(m =>
      (selectedItem?.type === 'master' && selectedItem?.master?.id === m.id) ||
      (selectedItem?.type === 'klon' && (kloneByMasterId[m.id] || []).some(k => k.id === selectedItem?.klon?.id))
    );
  });

  useEffect(() => {
    if (hasSelectedChild && !isOpen && onToggleOpen) {
      onToggleOpen(lernpaket.id, true);
    }
  }, [hasSelectedChild, isOpen, lernpaket.id, onToggleOpen]);

  return (
    <div>
      <button
         onClick={() => onToggleOpen?.(lernpaket.id, !isOpen)}
         className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
       >
         <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
         <Package className="w-4 h-4 shrink-0 text-amber-500" />
         <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
           paketActivities.length === 0 ? 'bg-red-100 text-red-700' : 
           paketActivities.length <= 2 ? 'bg-amber-100 text-amber-700' : 
           'bg-green-100 text-green-700'
         }`}>
           {paketActivities.length}
         </div>
       </button>

      {isOpen && (
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
                    {phaseActs.map(activity => {
                       const actCatalog = aktivitaetenKatalog.find(c => c.id === activity.aktivitaet_id);
                       return (
                         <ActivitySidebarItem
                           key={activity.id}
                           activity={activity}
                           aktivitaetName={aktivitaetenMap[activity.aktivitaet_id] || '…'}
                           masterAufgaben={masterAufgabenByActivityId[activity.id] || []}
                           kloneByMasterId={kloneByMasterId}
                           selectedItem={selectedItem}
                           onSelect={onSelect}
                           isIncomplete={!activity.is_complete}
                           myEmail={myEmail}
                           catalogEntry={actCatalog}
                         />
                       );
                     })}
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

export default function TaskCreationView({ einheitId, kannBearbeiten, userEmail, userRole, initialActivityId: initialActivityIdProp = null }) {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [debugSelectValue, setDebugSelectValue] = useState('');
  
  // ActivityID kann aus Props oder URL-Parametern kommen
  const initialActivityId = initialActivityIdProp || searchParams.get('activity');
  
  // selectedItem: null | { type: 'activity', activity } | { type: 'master', master } | { type: 'klon', klon }
  const [selectedItem, setSelectedItem] = useState(null);
  const [openPacketIds, setOpenPacketIds] = useState(new Set());

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

  // Alle MasterAufgaben für diese Einheit
  const paketIds = lernpakete.filter(lp => lp.einheit_id === einheitId).map(lp => lp.id);
  const { data: alleMaster = [] } = useQuery({
    queryKey: ['masterAufgaben', 'einheit', einheitId],
    queryFn: () => base44.entities.MasterAufgabe.list(),
    enabled: !!einheitId,
    select: (data) => data.filter(m => paketIds.includes(m.lernpaket_id)),
  });

  // Alle Klone für diese Einheit
  const { data: alleKlone = [] } = useQuery({
    queryKey: ['klone', 'einheit', einheitId],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
    enabled: !!einheitId,
  });

  const aktivitaetenMap = Object.fromEntries(aktivitaetenKatalog.map(a => [a.id, a.name]));

  // MasterAufgaben gruppiert nach activity_id, sortiert nach reihenfolge
  const masterAufgabenByActivityId = alleMaster.reduce((acc, m) => {
    if (!acc[m.activity_id]) acc[m.activity_id] = [];
    acc[m.activity_id].push(m);
    return acc;
  }, {});
  Object.values(masterAufgabenByActivityId).forEach(arr => arr.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)));

  // Klone gruppiert nach master_aufgabe_id
  const kloneByMasterId = alleKlone
    .filter(k => alleMaster.some(m => m.id === k.master_aufgabe_id))
    .reduce((acc, k) => {
      if (!acc[k.master_aufgabe_id]) acc[k.master_aufgabe_id] = [];
      acc[k.master_aufgabe_id].push(k);
      return acc;
    }, {});
  Object.values(kloneByMasterId).forEach(arr => arr.sort((a, b) => (a.klon_index || 0) - (b.klon_index || 0)));

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Selektiertes Objekt bei Daten-Updates synchronisieren
  useEffect(() => {
    if (selectedItem?.type === 'activity') {
      const updated = allActivities.find(a => a.id === selectedItem.activity.id);
      if (updated) setSelectedItem({ type: 'activity', activity: updated });
    }
    if (selectedItem?.type === 'master') {
      const updated = alleMaster.find(m => m.id === selectedItem.master.id);
      if (updated) setSelectedItem({ type: 'master', master: updated });
    }
    if (selectedItem?.type === 'klon') {
      const updated = alleKlone.find(k => k.id === selectedItem.klon.id);
      if (updated) setSelectedItem({ type: 'klon', klon: updated });
    }
  }, [allActivities, alleMaster, alleKlone]);

  // ── Kern-Funktion: Baum öffnen und Activity laden ─────────────────────────
  const openTreeAndLoadContent = (activityId) => {
    if (!activityId || allActivities.length === 0 || lernpakete.length === 0) return;

    console.log("🌳 openTreeAndLoadContent:", activityId);

    const activity = allActivities.find(a => a.id === activityId);
    if (!activity) {
      console.warn("❌ Activity nicht gefunden:", activityId);
      return;
    }

    // Lernpaket (Parent) und Themenfeld (Grandparent) ermitteln
    const paket = lernpakete.find(p => p.id === activity.lernpaket_id);
    const keysToExpand = paket ? [paket.id] : [];
    if (paket?.themenfeld_id) keysToExpand.push(paket.themenfeld_id);

    console.log("📁 Öffne Ordner:", keysToExpand);

    // Alle relevanten Ordner öffnen + Activity selektieren
    setOpenPacketIds(prev => new Set([...prev, ...keysToExpand]));
    setSelectedItem({ type: 'activity', activity });

    // Zum Element scrollen
    setTimeout(() => {
      const el = document.getElementById(`activity-node-${activityId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Wenn initialActivityId gesetzt: openTreeAndLoadContent aufrufen (mit Timing-Sicherheit)
  useEffect(() => {
    if (!initialActivityId || allActivities.length === 0 || lernpakete.length === 0) return;
    // Kurze Verzögerung sicherstellen, dass der Baum gerendert ist
    const timer = setTimeout(() => {
      openTreeAndLoadContent(initialActivityId);
      setDebugSelectValue(initialActivityId);
    }, 50);
    return () => clearTimeout(timer);
  }, [initialActivityId, allActivities, lernpakete]);

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
  const selectedActivity = selectedItem?.type === 'activity'
    ? selectedItem.activity
    : selectedItem?.type === 'master'
      ? allActivities.find(a => a.id === selectedItem.master.activity_id)
      : null;
  const selectedCatalog = selectedActivity
    ? aktivitaetenKatalog.find(c => c.id === selectedActivity.aktivitaet_id)
    : null;
  const supportsMaster = selectedCatalog?.supports_master === true;

  return (
    <div className="flex flex-row flex-1 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-96 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden h-full">
        <div className="px-3 py-3 border-b border-border shrink-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aktivitäten</p>
          {/* Aktivitäts-Selectbox (versteckt, Logik aktiv für programmatische Ansteuerung) */}
          {allActivities.filter(a => paketeFuerEinheit.some(p => p.id === a.lernpaket_id)).length > 0 && (
            <select
              value={debugSelectValue}
              onChange={e => {
                setDebugSelectValue(e.target.value);
                openTreeAndLoadContent(e.target.value);
              }}
              style={{ display: 'none' }}
            >
              <option value="">🔍 Debug: Aktivität direkt anspringen…</option>
              {allActivities
                .filter(a => paketeFuerEinheit.some(p => p.id === a.lernpaket_id))
                .sort((a, b) => (aktivitaetenMap[a.aktivitaet_id] || '').localeCompare(aktivitaetenMap[b.aktivitaet_id] || ''))
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {aktivitaetenMap[a.aktivitaet_id] || a.id} [{a.phase}]
                  </option>
                ))
              }
            </select>
          )}
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <div className="h-full overflow-y-auto space-y-3 pr-2">
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
                    masterAufgabenByActivityId={masterAufgabenByActivityId}
                    kloneByMasterId={kloneByMasterId}
                    selectedItem={selectedItem}
                    onSelect={setSelectedItem}
                    defaultOpen={idx === 0}
                    myEmail={userEmail}
                    isOpen={openPacketIds.has(lernpaket.id)}
                    onToggleOpen={(paketId, shouldOpen) => {
                       setOpenPacketIds(prev => {
                         const newSet = new Set(prev);
                         if (shouldOpen) {
                           newSet.add(paketId);
                         } else {
                           newSet.delete(paketId);
                         }
                         return newSet;
                       });
                     }}
                     aktivitaetenKatalog={aktivitaetenKatalog}
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
          </div>
          </aside>

          {/* ── Hauptbereich ─────────────────────────────────────────────────────── */}
          <main className="flex-1 w-full min-w-0 overflow-hidden h-full">
          <div className="h-full overflow-y-auto pr-2">
        {!selectedItem && <EmptyState />}

        {/* Aktivität oder Master gewählt → ActivityMasterPanel */}
         {(selectedItem?.type === 'activity' || selectedItem?.type === 'master') && selectedActivity && (
           <div className="max-w-3xl mx-auto px-6 py-6">
             <ActivityMasterPanel
               key={selectedActivity.id}
               activityRecord={selectedActivity}
               catalogEntry={selectedCatalog}
               supportsMaster={supportsMaster}
               kannBearbeiten={kannBearbeiten}
               userEmail={userEmail}
               userRole={userRole}
               einheitId={einheitId}
               selectedMasterId={selectedItem?.type === 'master' ? selectedItem.master.id : null}
               onMasterSelected={(masterId) => {
                 const master = alleMaster.find(m => m.id === masterId);
                 if (master) setSelectedItem({ type: 'master', master });
               }}
               onKlonSelected={(klonId) => {
                 const klon = alleKlone.find(k => k.id === klonId);
                 if (klon) setSelectedItem({ type: 'klon', klon });
               }}
             />
           </div>
         )}

        {/* Klon gewählt */}
        {selectedItem?.type === 'klon' && (() => {
          const klonMaster = alleMaster.find(m => m.id === selectedItem.klon.master_aufgabe_id);
          const klonActivity = klonMaster ? allActivities.find(a => a.id === klonMaster.activity_id) : null;
          const klonCatalog = klonActivity ? aktivitaetenKatalog.find(c => c.id === klonActivity.aktivitaet_id) : null;
          return (
            <div className="max-w-3xl mx-auto px-6 py-6">
              <KlonDetailView
                key={selectedItem.klon.id}
                klon={selectedItem.klon}
                kannBearbeiten={kannBearbeiten}
                userEmail={userEmail}
                masterAufgabe={klonMaster}
                activityRecord={klonActivity}
                catalogEntry={klonCatalog}
              />
            </div>
          );
        })()}
        </div>
        </main>

        </div>
        );
        }