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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ChevronRight, Package, MousePointerClick, Lock, Crown, CheckCircle2, Menu, X, PenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ActivityMasterPanel from '@/components/workspace/ActivityMasterPanel';
import KlonDetailView from '@/components/workspace/KlonDetailView';
import MasterDetailView from '@/components/workspace/MasterDetailView';
import Tab4LernpaketOverview from '@/components/workspace/Tab4LernpaketOverview';
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

function KlonSubItem({ klon, isSelected, onSelect }) {
   // Farb-Logik basierend auf content_status (nicht sync_status)
   const isReleased = klon.content_status === 'approved';
   const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
   const isIncomplete = !klon.is_complete;

   return (
     <button
       onClick={() => onSelect({ type: 'klon', klon })}
       className={cn(
         'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[11px] transition-colors',
         isSelected
           ? 'bg-primary/10 text-primary font-medium'
           : cn('hover:bg-muted', textColor)
       )}
     >
       <span className="flex-1 truncate">
         {isReleased ? '✓' : '○'} Kopie {klon.klon_index}
       </span>

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

   // Farb-Logik basierend auf content_status
   const isReleased = master.content_status === 'approved';
   const textColor = isReleased ? 'text-green-600' : 'text-orange-600';

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
               : cn('hover:bg-muted', textColor)
           )}
         >
           <Crown className="w-3 h-3 shrink-0 text-primary/70" />
           <span className="flex-1 truncate">{master.titel || `Master ${index}`}</span>
           {isReleased && (
             <CheckCircle2 className="w-3 h-3 shrink-0 text-green-600" title="Freigegeben" />
           )}
         </button>
       </div>

       {/* Expandierte Klone oder Inhalts-Preview für KI-Tutor */}
       {expanded && (
         <div className="ml-4 mt-0.5 border-l border-border pl-2 space-y-0.5">
           {klone.length > 0 ? (
             klone.map((klon) => (
               <KlonSubItem
                 key={klon.id}
                 klon={klon}
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

    // Farb-Logik: Aktivitätsname grün, wenn die Aktivität vollständig ist,
    // sonst orange (= unfertig). Maßgeblich ist das vom Backend gepflegte
    // Aggregat-Flag `is_complete` (siehe Logbuch §17).
    const isComplete = activity.is_complete === true;
    const textColor = isComplete ? 'text-green-600' : 'text-orange-600';

    return (
      <div>
        <button
          id={`activity-node-${activity.id}`}
          onClick={() => onSelect({ type: 'activity', activity })}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
            isActivitySelected
              ? 'bg-primary text-primary-foreground font-medium'
              : cn('hover:bg-muted', textColor)
          )}
        >
          {activity.content_status === 'approved' && (
            <Lock
              className={cn(
                "w-3 h-3 shrink-0 mr-1",
                // Im selektierten Zustand ist der Hintergrund dunkelblau —
                // ein grünes Schloss würde im Kontrast verschwinden. Daher
                // weiß rendern, sonst weiterhin im Freigabe-Grün.
                isActivitySelected ? "text-primary-foreground" : "text-green-600"
              )}
              title="Aktivität ist freigegeben und gesperrt"
            />
          )}
          <span className="flex-1 truncate">{aktivitaetName}</span>
          {lockedByOther && !isActivitySelected && (
            <Lock className="w-3 h-3 text-amber-500 shrink-0" title={`Gesperrt von ${activity.locked_by_user}`} />
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
  expandedPhases, setExpandedPhases, isEditingActive = false,
}) {
  const isLernpaketSelected = selectedItem?.type === 'lernpaket' && selectedItem?.lernpaket?.id === lernpaket.id;
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

  // Initial-Auto-Open: einmalig öffnen, wenn ein Kind dieses Pakets
  // selektiert ist. KEIN permanenter Effekt — sonst würde das Akkordeon
  // jeden manuellen Wechsel auf ein anderes Paket sofort revertieren,
  // weil die Selection im alten Paket noch lebt (Bug 2026-05-14).
  const didAutoOpenRef = React.useRef(false);
  useEffect(() => {
    if (hasSelectedChild && !isOpen && !didAutoOpenRef.current && onToggleOpen) {
      didAutoOpenRef.current = true;
      onToggleOpen(lernpaket.id, true);
    }
  }, [hasSelectedChild, isOpen, lernpaket.id, onToggleOpen]);

  // Prüfe ob dieses Paket das aktive (gesperrte) ist
  const isActiveLocked = isEditingActive && hasSelectedChild;

  return (
    <div className={cn(isActiveLocked && "rounded-lg ring-2 ring-orange-400 bg-orange-50/50 ml-1 mr-0.5")}>
      <button
         onClick={() => {
           onToggleOpen?.(lernpaket.id, !isOpen);
           onSelect?.({ type: 'lernpaket', lernpaket });
         }}
         className={cn(
           "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium transition-colors",
           isActiveLocked
             ? "text-orange-800 hover:bg-orange-100"
             : isLernpaketSelected
             ? "bg-primary text-primary-foreground"
             : "text-foreground hover:bg-muted"
         )}
       >
         <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
         <Package className={cn("w-4 h-4 shrink-0", isActiveLocked ? "text-orange-500" : isLernpaketSelected ? "text-primary-foreground" : "text-amber-500")} />
         <span className="flex-1 truncate">{lernpaket.titel_des_pakets}</span>
         {isActiveLocked && <PenLine className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-pulse" />}
         {/* Einheitliches Farbschema (analog Tab 3 SidebarTree):
             grau = leer, grün = alle Aktivitäten vollständig, gelb = teilweise. */}
         {(() => {
           const total = paketActivities.length;
           const completeCount = paketActivities.filter(a => a.is_complete === true).length;
           const pillClass =
             total === 0 ? 'bg-slate-200 text-slate-700'
             : completeCount === total ? 'bg-green-500 text-white'
             : 'bg-amber-400 text-white';
           return (
             <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0', pillClass)}>
               {total}
             </div>
           );
         })()}
       </button>

      {isOpen && (
        <div className="ml-5 mt-0.5 border-l border-border pl-2 space-y-0.5 pb-1">
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

              const phaseExpanded = expandedPhases[phase.key] !== false;
              const togglePhaseExpand = (phaseKey) => {
                setExpandedPhases(prev => ({
                  ...prev,
                  [phaseKey]: !prev[phaseKey],
                }));
              };

              return (
                <div key={phase.key}>
                  <button
                    onClick={() => togglePhaseExpand(phase.key)}
                    className="w-full flex items-center gap-1.5 px-2 py-0.5 text-left text-[10px] font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', phaseExpanded && 'rotate-90')} />
                    {phase.icon} <span className="uppercase tracking-wide">{phase.label}</span>
                  </button>
                  {phaseExpanded && (
                    <div className="ml-2 border-l border-border/40 pl-2 space-y-0.5">
                      {phaseActs.map(activity => {
                         const actCatalog = aktivitaetenKatalog.find(c => c.id === activity.aktivitaet_id);
                         const masters = masterAufgabenByActivityId[activity.id] || [];
                         const supportsMaster = actCatalog?.supports_master === true;

                         // Completion-Logik unterscheidet zwischen Masters-Aktivitäten und normalen Aktivitäten
                         let isComplete = false;
                         if (supportsMaster) {
                           // Für Master-Aktivitäten: Alle Masters müssen approved sein
                           isComplete = masters.length > 0 && masters.every(m => m.content_status === 'approved');
                         } else {
                           // Für normale Aktivitäten (z.B. Text lesen): content_status === 'approved' ist ausreichend
                           isComplete = activity.content_status === 'approved';
                         }

                         return (
                           <ActivitySidebarItem
                             key={activity.id}
                             activity={activity}
                             aktivitaetName={aktivitaetenMap[activity.aktivitaet_id] || '…'}
                             masterAufgaben={masters}
                             kloneByMasterId={kloneByMasterId}
                             selectedItem={selectedItem}
                             onSelect={onSelect}
                             isIncomplete={!isComplete}
                             myEmail={myEmail}
                             catalogEntry={actCatalog}
                           />
                         );
                       })}
                    </div>
                  )}
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

export default function TaskCreationView({ einheitId, kannBearbeiten, userEmail, userRole, initialActivityId: initialActivityIdProp = null, globalEditActive = false }) {
   const queryClient = useQueryClient();
   const [searchParams] = useSearchParams();
   const [debugSelectValue, setDebugSelectValue] = useState('');
   const [sidebarOpen, setSidebarOpen] = useState(false);

   // Globaler Edit-Mode State: initial aus globalEditActive (DB-Zustand), dann lokal überschreibbar
   const [isEditingActive, setIsEditingActive] = useState(globalEditActive);
   const releaseEditLockRef = React.useRef(null);
   const currentPaketLockRef = React.useRef(null);

   // Sync mit globalEditActive bei Tab-Rückkehr (Persistenz über Tab-Wechsel)
   useEffect(() => {
     if (globalEditActive && !isEditingActive) {
       setIsEditingActive(true);
     } else if (!globalEditActive && isEditingActive && !releaseEditLockRef.current) {
       // Lock ist extern abgelaufen/freigegeben worden
       setIsEditingActive(false);
     }
   }, [globalEditActive]);

   const handleEditModeChange = React.useCallback((isEditing, releaseFn) => {
      setIsEditingActive(isEditing);
      if (isEditing && releaseFn) releaseEditLockRef.current = releaseFn;
      if (!isEditing) releaseEditLockRef.current = null;
    }, []);

   // Hart-Reset: Bricht den Bearbeitungsmodus immer ab, auch wenn nach einem
   // Verbindungsabbruch / Reload der lokale releaseEditLockRef.current verloren
   // ging. In diesem Fall ist der Paket-Lock noch in der DB, aber wir haben
   // keinen Cleanup-Callback mehr im Speicher. Wir suchen daher das vom User
   // selbst gehaltene Lernpaket direkt in der DB und geben es hart frei –
   // releaseLernpaketLockSecure erlaubt das dem Lock-Besitzer.
   const handleGlobalExitEdit = async () => {
      try {
        // 1) Falls eine reguläre Release-Funktion registriert ist, diese
        //    bevorzugt aufrufen (sie räumt zusätzlich Heartbeats auf).
        if (releaseEditLockRef.current) {
          try { await releaseEditLockRef.current(); } catch (e) { console.warn('[Tab4] regular release failed:', e); }
        }

        // 2) Fallback: Alle vom aktuellen User in dieser Einheit gehaltenen
        //    Lernpaket-Locks hart freigeben (idempotent, deckt auch verwaiste
        //    Locks nach Verbindungsabbruch ab).
        const myLockedPakete = (lernpakete || []).filter(
          (p) =>
            p.einheit_id === einheitId &&
            p.is_locked &&
            p.locked_by_email === userEmail
        );
        if (myLockedPakete.length > 0) {
          await Promise.all(
            myLockedPakete.map((p) =>
              base44.functions
                .invoke('releaseLernpaketLockSecure', { lernpaketId: p.id })
                .catch((err) => console.warn('[Tab4] release fallback failed:', p.id, err))
            )
          );
        }

        // 3) Auch den lokal gemerkten Lock-Ref (falls er von Punkt 2 nicht
        //    erfasst wurde, z. B. weil noch nicht synchron gefetcht) sicher
        //    freigeben. Härtung 2026-05-14: läuft jetzt über den
        //    gesicherten Endpunkt statt direkter Entity-Mutation.
        if (currentPaketLockRef.current) {
          const lockedPaketId = currentPaketLockRef.current;
          currentPaketLockRef.current = null;
          try {
            await base44.functions.invoke('releaseLernpaketLockSecure', {
              lernpaketId: lockedPaketId,
            });
          } catch (e) {
            console.warn('[Tab4] direct ref release failed:', e);
          }
        }

        toast.success('✅ Bearbeitungsmodus beendet.');
      } catch (err) {
        console.error('[Tab4] handleGlobalExitEdit error:', err);
        toast.error('Fehler beim Beenden des Bearbeitungsmodus – bitte Seite neu laden.');
      } finally {
        // 4) UI-State IMMER zurücksetzen – auch wenn DB-Calls fehlschlagen.
        //    Der Backend-Lock-Reaper räumt nach 30 Min. ohnehin auf.
        setIsEditingActive(false);
        releaseEditLockRef.current = null;
        // Workspace-Daten frisch laden, damit der Edit-Banner (der sich aus
        // is_locked/locked_by_email der Lernpakete im workspace-data-Query
        // ableitet) NACH Tab-Wechsel nicht wieder erscheint.
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['workspace-data', einheitId], type: 'all' }),
          queryClient.refetchQueries({ queryKey: ['lernpakete'], type: 'all' }),
        ]);
      }
    };

   // ActivityID kann aus Props oder URL-Parametern kommen
   const initialActivityId = initialActivityIdProp || searchParams.get('activity');

   // selectedItem: null | { type: 'activity', activity } | { type: 'master', master } | { type: 'klon', klon }
   const [selectedItem, setSelectedItem] = useState(null);
   // Akkordeon: immer nur EIN Lernpaket offen (analog Tab 3 SidebarTree).
   const [openPacketIds, setOpenPacketIds] = useState(new Set());
   const [expandedPhases, setExpandedPhases] = useState({});

   // Paket-Lock auf DB setzen/freigeben wenn isEditingActive wechselt.
   //
   // Härtung 2026-05-14 (OCC-Lücke A schließen):
   // Vorher hat dieser Effekt den Lernpaket-Lock direkt über
   // `base44.entities.Lernpakete.update(...)` gesetzt. Damit war der
   // OCC-Race-Schutz aus `acquireLockSecure` umgangen — zwei User konnten
   // theoretisch zeitgleich in Tab 4 denselben Paket-Lock erwerben und
   // sich gegenseitig überschreiben. Wir gehen jetzt zwingend über die
   // gesicherten Backend-Endpunkte, die Read-Bump-ReRead-Verify nutzen
   // und bei Konflikt einen Klartext-Namen zurückgeben.
   useEffect(() => {
     const selectedPaketId = selectedItem?.type === 'activity' ? selectedItem.activity?.lernpaket_id : null;

     if (isEditingActive && selectedPaketId) {
       (async () => {
         try {
           const res = await base44.functions.invoke('acquireLockSecure', {
             lernpaketId: selectedPaketId,
           });
           const data = res?.data ?? res;
           const status = res?.status;
           const failed =
             (status !== undefined && status >= 400) ||
             (data && (data.success === false || data.error));
           if (failed) {
             // Lock konnte nicht erworben werden → Edit-Modus zurückrollen,
             // damit das UI nicht in einem "ich darf bearbeiten"-Schein-
             // zustand verbleibt.
             const msg =
               data?.error ||
               'Lernpaket konnte nicht zur Bearbeitung gesperrt werden.';
             toast.error(msg);
             setIsEditingActive(false);
             releaseEditLockRef.current = null;
             return;
           }
           currentPaketLockRef.current = selectedPaketId;
         } catch (err) {
           const apiMsg =
             err?.response?.data?.error || err?.message || 'Unbekannter Fehler';
           toast.error(`Sperre konnte nicht gesetzt werden: ${apiMsg}`);
           setIsEditingActive(false);
           releaseEditLockRef.current = null;
         }
       })();
     } else if (!isEditingActive && currentPaketLockRef.current) {
       const lockedPaketId = currentPaketLockRef.current;
       currentPaketLockRef.current = null;
       (async () => {
         try {
           await base44.functions.invoke('releaseLernpaketLockSecure', {
             lernpaketId: lockedPaketId,
           });
         } catch (err) {
           console.warn('Fehler beim Freigeben des Paket-Locks:', err?.message);
         }
       })();
     }
   }, [isEditingActive, selectedItem?.type, selectedItem?.activity?.lernpaket_id, userEmail]);

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
    // Tombstones (sync_status='to_delete') ausblenden, sonst bleiben gelöschte
    // Aktivitäten im Sidebar-Baum von Tab 4 sichtbar.
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      sync_status: { $ne: 'to_delete' },
    }),
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

  // Selektiertes Objekt bei Daten-Updates synchronisieren – NUR wenn kein Edit-Modus aktiv
  // (sonst würden Hintergrund-Refetches ungespeicherte Formular-Eingaben überschreiben)
  useEffect(() => {
    if (isEditingActive) return;
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
  }, [allActivities, alleMaster, alleKlone, isEditingActive]);

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

    // Akkordeon: nur das Lernpaket der angesprungenen Aktivität offen halten,
    // alle anderen Pakete einklappen (analog Tab 3).
    setOpenPacketIds(paket ? new Set([paket.id]) : new Set());
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

  // Catalog-Entry für Ansicht A (Aktivität direkt gewählt)
  const selectedActivity = selectedItem?.type === 'activity' ? selectedItem.activity : null;
  const selectedCatalog = selectedActivity ? aktivitaetenKatalog.find(c => c.id === selectedActivity.aktivitaet_id) : null;
  const supportsMaster = selectedCatalog?.supports_master === true;

  // Lernpaket-Name für Breadcrumb/Overline in allen Detailansichten
  const getLernpaketName = (lernpaketId) =>
    lernpakete.find(lp => lp.id === lernpaketId)?.titel_des_pakets || null;

  // Wenn man auf eine Aktivität aus der Tab4LernpaketOverview klickt
  const handleActivitySelectFromOverview = (activity) => {
    setSelectedItem({ type: 'activity', activity });
  };

  // Cleanup bei Unmount: Lock freigeben.
  // Härtung 2026-05-14: nutzt jetzt ebenfalls den gesicherten Endpunkt,
  // damit Audit-Log und RBAC-Pfad konsistent bleiben.
  useEffect(() => {
    return () => {
      if (isEditingActive && currentPaketLockRef.current) {
        const lockedPaketId = currentPaketLockRef.current;
        currentPaketLockRef.current = null;
        base44.functions
          .invoke('releaseLernpaketLockSecure', { lernpaketId: lockedPaketId })
          .catch((err) =>
            console.warn('Fehler beim Cleanup-Freigeben des Paket-Locks:', err?.message)
          );
      }
    };
  }, [isEditingActive]);

  return (
    <div className="flex flex-row flex-1 overflow-hidden">

      {/* Lock-Warning für ausgewähltes Lernpaket */}
      {selectedItem?.type === 'activity' && selectedItem?.activity?.is_locked && selectedItem?.activity?.locked_by_email && selectedItem?.activity?.locked_by_email !== userEmail && (
        <div className="shrink-0 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>
            <strong>🔒 Dieses Lernpaket wird gerade von {selectedItem.activity.locked_by_email} bearbeitet</strong>
          </span>
        </div>
      )}

      {/* ── Burger-Menü Button (lg-breaker) ──────────────────────────────────── */}
      <div className="lg:hidden shrink-0 px-3 py-3 border-r border-border bg-card/50 h-full flex flex-col items-center justify-start pt-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Sidebar (Mobile Overlay) ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed lg:static lg:w-96 z-50 w-80 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden h-full transition-transform lg:transition-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isEditingActive && "border-r-2 border-r-orange-400"
      )}>

        <div className="px-3 py-3 border-b border-border shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aktivitäten</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
          <div className="flex-1 overflow-hidden min-h-0 p-2">
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
                       // Akkordeon-Verhalten: beim Öffnen wird das angeklickte
                       // Paket zum einzigen offenen Knoten; beim Schließen
                       // wird alles eingeklappt.
                       setOpenPacketIds(shouldOpen ? new Set([paketId]) : new Set());
                     }}
                     aktivitaetenKatalog={aktivitaetenKatalog}
                     expandedPhases={expandedPhases}
                     setExpandedPhases={setExpandedPhases}
                     isEditingActive={isEditingActive}
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
          <main className={cn(
            "flex-1 w-full min-w-0 overflow-hidden h-full lg:flex hidden flex-col transition-colors",
            isEditingActive && "bg-orange-50/60 ring-2 ring-inset ring-orange-300"
          )}>
            {/* Sticky Edit-Banner im Hauptbereich */}
            {isEditingActive && (
              <div className="shrink-0 bg-orange-500 text-white px-6 py-2.5 flex items-center gap-3">
                <PenLine className="w-4 h-4 shrink-0 animate-pulse" />
                <span className="text-sm font-semibold flex-1">✏️ Bearbeitungsmodus aktiv – das Lernpaket ist für andere gesperrt</span>
                <button
                  onClick={handleGlobalExitEdit}
                  className="flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                  Bearbeitung abschließen
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-h-0">
        {!selectedItem && <EmptyState />}

        {/* Ansicht LP: Lernpaket gewählt → Übersicht (Tab4LernpaketOverview) */}
        {selectedItem?.type === 'lernpaket' && (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <Tab4LernpaketOverview
              paket={selectedItem.lernpaket}
              einheit={null}
              kannBearbeiten={kannBearbeiten}
              onActivitySelect={handleActivitySelectFromOverview}
            />
          </div>
        )}

        {/* Ansicht A: Aktivität gewählt → Übersicht (ActivityMasterPanel) */}
        {selectedItem?.type === 'activity' && selectedActivity && (
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
              parentLernpaketName={getLernpaketName(selectedActivity.lernpaket_id)}
              onMasterSelected={(masterId) => {
                const master = alleMaster.find(m => m.id === masterId);
                if (master) setSelectedItem({ type: 'master', master });
              }}
              onKlonSelected={(klonId) => {
                const klon = alleKlone.find(k => k.id === klonId);
                if (klon) setSelectedItem({ type: 'klon', klon });
              }}
              onEditModeChange={handleEditModeChange}
              globalEditActive={isEditingActive}
            />
          </div>
        )}

        {/* Ansicht B: Master gewählt → fokussierte Master-Detailansicht */}
        {selectedItem?.type === 'master' && (() => {
          const master = selectedItem.master;
          const masterActivity = allActivities.find(a => a.id === master.activity_id);
          const masterCatalog = masterActivity ? aktivitaetenKatalog.find(c => c.id === masterActivity.aktivitaet_id) : null;
          const masterKlone = kloneByMasterId[master.id] || [];
          const masterIndex = (masterAufgabenByActivityId[master.activity_id] || []).findIndex(m => m.id === master.id) + 1;
          return (
            <div className="max-w-3xl mx-auto px-6 py-6">
              <MasterDetailView
                key={master.id}
                master={master}
                index={masterIndex}
                catalogEntry={masterCatalog}
                klone={masterKlone}
                kannBearbeiten={kannBearbeiten}
                userEmail={userEmail}
                parentLernpaketName={getLernpaketName(master.lernpaket_id)}
                onDeleted={() => setSelectedItem(masterActivity ? { type: 'activity', activity: masterActivity } : null)}
                onEditModeChange={handleEditModeChange}
              />
            </div>
          );
        })()}

        {/* Ansicht C: Klon gewählt → fokussierte Klon-Detailansicht */}
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
                parentLernpaketName={getLernpaketName(selectedItem.klon.lernpaket_id)}
                onKlonDeleted={() => setSelectedItem(klonMaster ? { type: 'master', master: klonMaster } : null)}
                onEditModeChange={handleEditModeChange}
              />
            </div>
          );
        })()}
        </div>
      </main>

      {/* ── Hauptbereich Mobile (fullscreen wenn Sidebar offen) ──────────────── */}
      <main className="flex-1 w-full min-w-0 overflow-hidden h-full lg:hidden">
        {!sidebarOpen && (
          <div className="h-full overflow-y-auto min-h-0">
            {!selectedItem && <EmptyState />}

            {/* Ansicht LP: Lernpaket gewählt */}
            {selectedItem?.type === 'lernpaket' && (
              <div className="max-w-3xl mx-auto px-6 py-6">
                <Tab4LernpaketOverview
                  paket={selectedItem.lernpaket}
                  einheit={null}
                  kannBearbeiten={kannBearbeiten}
                  onActivitySelect={handleActivitySelectFromOverview}
                />
              </div>
            )}

            {/* Ansicht A: Aktivität */}
            {selectedItem?.type === 'activity' && selectedActivity && (
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
                   parentLernpaketName={getLernpaketName(selectedActivity.lernpaket_id)}
                   onMasterSelected={(masterId) => {
                     const master = alleMaster.find(m => m.id === masterId);
                     if (master) setSelectedItem({ type: 'master', master });
                   }}
                   onKlonSelected={(klonId) => {
                     const klon = alleKlone.find(k => k.id === klonId);
                     if (klon) setSelectedItem({ type: 'klon', klon });
                   }}
                   onEditModeChange={handleEditModeChange}
                   globalEditActive={isEditingActive}
                 />
              </div>
            )}

            {/* Ansicht B: Master */}
            {selectedItem?.type === 'master' && (() => {
              const master = selectedItem.master;
              const masterActivity = allActivities.find(a => a.id === master.activity_id);
              const masterCatalog = masterActivity ? aktivitaetenKatalog.find(c => c.id === masterActivity.aktivitaet_id) : null;
              const masterKlone = kloneByMasterId[master.id] || [];
              const masterIndex = (masterAufgabenByActivityId[master.activity_id] || []).findIndex(m => m.id === master.id) + 1;
              return (
                <div className="max-w-3xl mx-auto px-6 py-6">
                  <MasterDetailView
                    key={master.id}
                    master={master}
                    index={masterIndex}
                    catalogEntry={masterCatalog}
                    klone={masterKlone}
                    kannBearbeiten={kannBearbeiten}
                    userEmail={userEmail}
                    parentLernpaketName={getLernpaketName(master.lernpaket_id)}
                    onDeleted={() => setSelectedItem(masterActivity ? { type: 'activity', activity: masterActivity } : null)}
                    onEditModeChange={handleEditModeChange}
                  />
                </div>
              );
            })()}

            {/* Ansicht C: Klon */}
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
                    parentLernpaketName={getLernpaketName(selectedItem.klon.lernpaket_id)}
                    onKlonDeleted={() => setSelectedItem(klonMaster ? { type: 'master', master: klonMaster } : null)}
                    onEditModeChange={handleEditModeChange}
                  />
                </div>
              );
            })()}
          </div>
        )}
      </main>

    </div>
  );
}