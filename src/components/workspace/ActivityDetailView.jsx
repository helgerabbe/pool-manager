/**
 * ActivityDetailView
 *
 * Kompakter Header für eine Aktivität in Tab 4.
 * Zeigt: Name, Phase, Status-Badges, Bearbeitungsmodus-Button, Freigabe-Button.
 * Keine Formularfelder mehr – Inhalte werden in den Masteraufgaben gepflegt.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getAktivitaetenKatalog } from '@/services/AktivitaetService';
import { useLernpaketLock, useEinheitLock } from '@/hooks/useLocks';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Unlock, PenLine, Loader2, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ApprovalStatusBadge from '@/components/workspace/ApprovalStatusBadge';
import ApprovalActionButton from '@/components/workspace/ApprovalActionButton';
import EinheitLockBanner from '@/components/workspace/EinheitLockBanner';
// Phase 10 (Freigabe-Konzept 2026-05-14): neuer Sync-Badge + Lock-Indikator.
import SyncStatusBadge from '@/components/release/SyncStatusBadge';
import SidebarLockIcon from '@/components/release/SidebarLockIcon';

export default function ActivityDetailView({ activityRecord, kannBearbeiten, queryClient, einheitFach, onEditModeChange }) {
  const { permissions } = useRBAC();
  const istAdminOderFachschaft = permissions?.istAdmin;
  const [lockTransition, setLockTransition] = useState(null); // 'activating' | 'deactivating' | null

  const einheitId = activityRecord?.einheit_id;
  const { isUnitLocked, lockedByEmail: unitLockedByEmail } = useEinheitLock(einheitId);

  const {
    canEdit: canEditFromLock,
    isLockedByOther,
    lockedByEmail,
    isLoading: isLockLoading,
    acquireLock,
    releaseLock,
  } = useLernpaketLock(activityRecord?.lernpaket_id);

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => getAktivitaetenKatalog(),
  });

  const catalog = aktivitaetenKatalog?.find(a => a.id === activityRecord?.aktivitaet_id);
  // Ring der Macht: `kannBearbeiten` kommt vom Workspace und ist bei
  // final freigegebener Einheit bereits false. Der frühere Admin-Bypass
  // (`permissions?.istAdmin || kannBearbeiten`) hat den Lifecycle-Lock
  // umgangen — entfernt. Admins haben weiterhin volle Rechte, aber NUR
  // wenn die Einheit nicht final ist.
  const kannInhalteBearbeiten = kannBearbeiten && !isUnitLocked;

  // Edit-Mode nach oben melden (für globales Banner in TaskCreationView)
  useEffect(() => {
    onEditModeChange?.(canEditFromLock, releaseLock);
  }, [canEditFromLock]);

  const handleEnterEditMode = async () => {
    if (!canEditFromLock) {
      setLockTransition('activating');
      const result = await acquireLock();
      setLockTransition(null);
      if (!result?.ok) {
        toast.error(result?.error || `Aktivität ist bereits gesperrt von ${lockedByEmail}`);
      }
    }
  };

  const handleExitEditMode = async () => {
    setLockTransition('deactivating');
    await releaseLock();
    setLockTransition(null);
  };

  const handleForceUnlock = async () => {
    try {
      await base44.functions.invoke('forceReleaseLockAdmin', {
        lernpaketId: activityRecord?.lernpaket_id,
      });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      toast.success('Lock wurde aufgehoben.');
    } catch {
      toast.error('Lock konnte nicht aufgehoben werden.');
    }
  };

  if (!activityRecord || !catalog) return null;

  const isInEditMode = canEditFromLock;

  return (
    <div className="space-y-3 relative">
      {/* Overlay während Lock-Transition */}
      {lockTransition && (
        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            {lockTransition === 'activating' ? 'Bearbeitungsmodus wird aktiviert…' : 'Bearbeitungsmodus wird beendet…'}
          </p>
          <p className="text-xs text-muted-foreground">Bitte einen kurzen Augenblick warten.</p>
        </div>
      )}
      {isUnitLocked && (
        <EinheitLockBanner isUnitLocked={isUnitLocked} lockedByEmail={unitLockedByEmail} />
      )}

      {/* Lock-Banner: Zeigt wer die Aktivität gerade bearbeitet */}
      {isLockedByOther && lockedByEmail && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Diese Aktivität wird gerade von <strong>{lockedByEmail}</strong> bearbeitet. Der Bearbeitungsmodus kann erst aktiviert werden, wenn die Bearbeitung abgeschlossen ist.
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Linke Seite: Name + Badges */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">{catalog.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Phase: {activityRecord.phase}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {isInEditMode && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium">
                <PenLine className="w-3 h-3" />
                In Bearbeitung
              </div>
            )}
            {/* Phase 10: Sync-Achse (Neu / In Sync / Out of Sync) — eigenständig
                vom Freigabe-Status, der weiter über ApprovalStatusBadge läuft. */}
            <SyncStatusBadge status={activityRecord.sync_status || 'new'} />
            {/* Phase 10: Mini-Schloss neben dem Approval-Badge, wenn die
                Aktivität freigegeben ist — symmetrisch zur Sidebar-Markierung. */}
            <SidebarLockIcon released={activityRecord.content_status === 'approved'} />
            {!activityRecord.is_complete && activityRecord.content_status !== 'approved' && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Inhalt unvollständig
              </div>
            )}
            <ApprovalStatusBadge contentStatus={activityRecord.content_status} />
          </div>
        </div>

        {/* Rechte Seite: Buttons */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex gap-2 flex-wrap justify-end">
            {isLockedByOther && istAdminOderFachschaft && (
              <Button size="sm" variant="outline" onClick={handleForceUnlock}
                className="gap-2 border-amber-400 text-amber-800 hover:bg-amber-50">
                <Unlock className="w-3.5 h-3.5" />
                Sperre aufheben
              </Button>
            )}

            {!isInEditMode ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnterEditMode}
                disabled={isLockLoading || isLockedByOther || !kannInhalteBearbeiten}
                className="gap-2"
              >
                {isLockLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Prüfe Status...</>
                  : <><PenLine className="w-3.5 h-3.5" /> Bearbeitungsmodus aktivieren</>
                }
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleExitEditMode} className="gap-2">
                <X className="w-3.5 h-3.5" />
                Bearbeitung beenden
              </Button>
            )}
          </div>

          <ApprovalActionButton
            entityId={activityRecord.id}
            entityType="activity"
            contentStatus={activityRecord.content_status}
            missingFields={!activityRecord.is_complete ? ['Inhalt der Aktivität unvollständig'] : []}
            kannBearbeiten={kannInhalteBearbeiten}
          />
        </div>
      </div>
    </div>
  );
}