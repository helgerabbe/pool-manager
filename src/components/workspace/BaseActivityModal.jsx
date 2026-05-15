import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertCircle, Lock } from 'lucide-react';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';

// Phase 7 (Freigabe-Konzept 2026-05-14): Zentral im BaseActivityModal,
// damit alle 8 Modal-Nutzer (MatchTerms, Lückentext, MC, Test, MiniQuiz,
// Sorting, ImageLabeling, KITutor) den neuen Workflow auf einen Schlag bekommen.
import CompletenessIndicator from '@/components/release/CompletenessIndicator';
import ReleaseToggleSection from '@/components/release/ReleaseToggleSection';
import ReleasedLockedBanner from '@/components/release/ReleasedLockedBanner';
import { useActivityCompleteness } from '@/hooks/useCompleteness';
import { useActivityLockState, useCanToggleActivityRelease } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';

export default function BaseActivityModal({
  open,
  onOpenChange,
  title,
  initialData = {},
  onSave,
  onDelete,
  onReset,
  isSaving = false,
  isCopy = false,
  exportLocked = false,
  children,
  // Phase 7 — Freigabe-Konzept:
  // Wenn diese Felder gesetzt sind, wird die Vollständigkeits- und
  // Sperrlogik aktiviert. Bleiben sie undefined, verhält sich das Modal
  // exakt wie vorher (Rückwärtskompat für ältere Aufrufer).
  activity = null,                   // LernpaketPhaseAktivitaet-Record
  catalogEntry = null,               // AktivitaetenKatalog-Record
  parentLernpaket = null,
  parentEinheit = null,
  // Wenn das Modal mit „live"-fieldValues arbeitet (z.B. Editor-Drafts), kann
  // der Parent sie hier durchreichen, damit die Vollständigkeitsanzeige live
  // mitläuft. Andernfalls werden activity.field_values verwendet.
  liveFieldValues = null,
  footerExtra = null,
  readOnly = false,
  lockedMessage = null,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Phase 7: Vollständigkeit & Sperre
  const hasReleaseControls = !!activity && !!catalogEntry;
  const completeness = useActivityCompleteness(
    catalogEntry,
    liveFieldValues ?? activity?.field_values ?? {}
  );
  const lockState = useActivityLockState(activity, parentLernpaket, parentEinheit);
  const canToggle = useCanToggleActivityRelease(activity, parentLernpaket, parentEinheit);
  const isReleased = activity?.content_status === 'approved';
  const { setReleaseStatus, isPending: isReleasePending } = useSetReleaseStatus();

  const handleSave = () => {
    if (readOnly) return;
    // Phase 7: content_status wird NICHT mehr beim Speichern gesetzt —
    // ausschließlich über setReleaseStatusSecure.
    onSave({});
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete?.();
    setIsDeleting(false);
    setDeleteConfirm(false);
  };

  const handleClose = () => {
    setDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleToggleRelease = (next) => {
    if (!activity?.id) return;
    setReleaseStatus({ targetType: 'activity', targetId: activity.id, release: next });
  };

  // Hard-Lock im Footer = Hierarchie blockiert ODER export-locked ODER speichert
  const hardDisableSave =
    readOnly || isSaving || isDeleting || exportLocked || lockState.locked || isReleasePending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>

        {exportLocked && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">Einheit wurde für Moodle-Export gesperrt</p>
            </div>
          </div>
        )}

        {readOnly && lockedMessage && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-900">Masteraufgabe freigegeben</p>
              <p className="text-xs text-green-800 mt-0.5">{lockedMessage}</p>
            </div>
          </div>
        )}

        {hasReleaseControls && lockState.locked && (
          <ReleasedLockedBanner
            reason={lockState.reason}
            releasedAt={activity?.released_at}
            releasedBy={activity?.released_by}
            onUnrelease={
              lockState.reason === 'activity_released' && canToggle.allowed && !isReleasePending
                ? () => handleToggleRelease(false)
                : null
            }
            isUnreleasing={isReleasePending}
            hardLocked={!canToggle.allowed}
          />
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        <div className="px-6 py-5 border-t border-border shrink-0 space-y-3">
          {footerExtra}

          {hasReleaseControls && !isReleased && !lockState.locked && !completeness.isComplete && (
            <CompletenessIndicator result={completeness} />
          )}

          {hasReleaseControls && !lockState.locked && (
            <ReleaseToggleSection
              isReleased={isReleased}
              canRelease={completeness.isComplete}
              hierarchyLocked={!canToggle.allowed}
              hierarchyLockMessage={
                canToggle.reason === 'einheit_final'
                  ? 'Einheit ist final freigegeben — Freigaben gesperrt'
                  : canToggle.reason === 'lernpaket_released'
                  ? 'Lernpaket ist freigegeben — erst dort Freigabe zurücknehmen'
                  : null
              }
              onToggle={handleToggleRelease}
              releasedAt={activity?.released_at}
              releasedBy={activity?.released_by}
              disabled={isSaving || isReleasePending || exportLocked}
            />
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {onDelete && !readOnly && !deleteConfirm && !lockState.locked && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} disabled={isSaving || isDeleting || exportLocked} className="gap-1.5 text-destructive hover:bg-red-50 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  {isCopy ? 'Kopie löschen' : 'Aufgabe löschen'}
                </Button>
              )}
              {deleteConfirm && (
                <>
                  <span className="text-xs text-destructive font-medium">Wirklich löschen?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="gap-1.5 h-7 text-xs">
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Ja, löschen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)} disabled={isDeleting} className="h-7 text-xs">
                    Abbrechen
                  </Button>
                </>
              )}
              {onReset && !readOnly && !deleteConfirm && !lockState.locked && (
                <ActivityResetButton
                  onReset={onReset}
                  disabled={isSaving || isDeleting || exportLocked}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSaving || isDeleting}>
                {readOnly || lockState.locked ? 'Schließen' : 'Abbrechen'}
              </Button>
              {!readOnly && !lockState.locked && (
                <Button onClick={handleSave} disabled={hardDisableSave} className="gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}