/**
 * SortingListModal.jsx
 *
 * Modal für die Bearbeitung von "Reihenfolge / Sortierung" Aktivitäten.
 * Öffnet sich nach erfolgreichem Lock-Erwerb.
 * Footer: Abbrechen (unlock + schließen) | Speichern (save + unlock + schließen)
 * Release-Toggle für content_status.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Trash2, Crown } from 'lucide-react';
import SortingListEditor from '@/components/workspace/SortingListEditor';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';

export default function SortingListModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onCancel,
  onDelete,
  onConvertToMaster,
  isSaving = false,
  isConverting = false,
  exportLocked = false,
}) {
  const [isReleased, setIsReleased] = useState(initialData?.content_status === 'approved');
  const [exportLockedWasEnabled, setExportLockedWasEnabled] = useState(exportLocked);
  const [editorData, setEditorData] = useState({
    instruction: initialData?.instruction || '',
    orderedItems: initialData?.orderedItems || [],
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bei jedem Öffnen Initialwerte neu laden
  useEffect(() => {
    if (open) {
      setIsReleased(initialData?.content_status === 'approved');
      setExportLockedWasEnabled(exportLocked);
      setEditorData({
        instruction: initialData?.instruction || '',
        orderedItems: initialData?.orderedItems || [],
      });
    }
  }, [open, initialData]);

  // Reagiere auf Export-Lock-Änderung während Modal geöffnet ist
  useEffect(() => {
    if (exportLocked && !exportLockedWasEnabled) {
      setExportLockedWasEnabled(true);
    }
  }, [exportLocked, exportLockedWasEnabled]);

  const handleCancel = () => {
    setDeleteConfirm(false);
    onCancel?.();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete?.();
    setIsDeleting(false);
    setDeleteConfirm(false);
  };

  const handleSave = () => {
    const payload = {
      ...editorData,
      content_status: isReleased ? 'approved' : 'draft',
    };

    if (initialData?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }

    onSave?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">
            Reihenfolge / Sortierung
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Definiere die korrekte Reihenfolge der Elemente für diese Aufgabe.
          </p>
        </DialogHeader>

        {/* Export-Lock Warning Banner */}
        {exportLocked && exportLockedWasEnabled && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">Einheit wurde für Moodle-Export gesperrt</p>
              <p className="text-xs text-red-700 mt-0.5">Speichern ist vorübergehend nicht möglich. Bitte warten Sie, bis der Export abgeschlossen ist.</p>
            </div>
          </div>
        )}

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          <SortingListEditor
            initialData={initialData}
            onChange={(data) => setEditorData(data)}
            readOnly={false}
            hideActions={true}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border shrink-0 space-y-4">
          <ReleaseStatusToggle isReleased={isReleased} onToggle={setIsReleased} disabled={isSaving} />
          <div className="flex items-center justify-between gap-3">
            {/* Lösch- & Promote-Buttons links */}
            <div className="flex items-center gap-2 flex-wrap">
              {onDelete && !deleteConfirm && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} disabled={isSaving || isDeleting || isConverting} className="gap-1.5 text-destructive hover:bg-red-50 hover:text-destructive">
                  <Trash2 className="w-4 h-4" /> Löschen
                </Button>
              )}
              {deleteConfirm && (
                <>
                  <span className="text-xs text-destructive font-medium">Wirklich löschen?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="gap-1.5 h-7 text-xs">
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Ja, löschen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)} disabled={isDeleting} className="h-7 text-xs">Abbrechen</Button>
                </>
              )}
              {onConvertToMaster && !deleteConfirm && (
                <Button variant="outline" size="sm" onClick={onConvertToMaster} disabled={isSaving || isDeleting || isConverting} className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5">
                  {isConverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                  Zur Masteraufgabe machen
                </Button>
              )}
            </div>
            {/* Speichern-Buttons rechts */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving || isDeleting || isConverting}>Abbrechen</Button>
              <Button onClick={handleSave} disabled={isSaving || exportLocked || isDeleting || isConverting} title={exportLocked ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : ''} className="gap-2">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}