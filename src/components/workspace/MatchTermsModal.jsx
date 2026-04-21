/**
 * MatchTermsModal.jsx
 *
 * Modal für die Bearbeitung von "Begriffe zuordnen" Aktivitäten.
 * Öffnet sich nach erfolgreichem Lock-Erwerb.
 * Footer: Abbrechen (unlock + schließen) | Speichern (save + unlock + schließen)
 * Release-Toggle für content_status.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import MatchTermsForm from '@/components/aufgaben/placeholders/MatchTermsForm';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';

export default function MatchTermsModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onCancel,
  isSaving = false,
  exportLocked = false,
}) {
  const [fieldValues, setFieldValues] = useState(initialData);
  const [isReleased, setIsReleased] = useState(initialData?.content_status === 'approved');
  const [exportLockedWasEnabled, setExportLockedWasEnabled] = useState(exportLocked);

  useEffect(() => {
    if (open) {
      setFieldValues(initialData || {});
      setIsReleased(initialData?.content_status === 'approved');
      setExportLockedWasEnabled(exportLocked);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (exportLocked && !exportLockedWasEnabled) {
      setExportLockedWasEnabled(true);
    }
  }, [exportLocked, exportLockedWasEnabled]);

  const handleCancel = () => {
    onCancel?.();
  };

  const handleSave = () => {
    const payload = {
      ...fieldValues,
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
            Begriffe zuordnen
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Definiere die Begriffspaare und optional Distraktoren für diese Aufgabe.
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
          <MatchTermsForm
            initialData={{
              instruction: fieldValues.instruction || '',
              pairs: fieldValues.pairs || [],
              distractors: (fieldValues.distractors || []).map(v => typeof v === 'string' ? { value: v } : v),
            }}
            onSave={(data) => {
              const cleanedData = {
                instruction: data.instruction,
                pairs: data.pairs,
                distractors: (data.distractors || []).map(d => typeof d === 'string' ? d : d.value).filter(Boolean),
              };
              const payload = {
                ...cleanedData,
                content_status: isReleased ? 'approved' : 'draft',
              };
              if (initialData?.moodle_sync_status === 'synced') {
                payload.moodle_sync_status = 'modified';
                payload.is_dirty_since_export = true;
              }
              onSave?.(payload);
            }}
            onCancel={handleCancel}
            onChange={() => {}}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border shrink-0 space-y-4">
          {/* Premium Release-Toggle */}
          <ReleaseStatusToggle
            isReleased={isReleased}
            onToggle={setIsReleased}
            disabled={isSaving}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || exportLocked}
              title={exportLocked ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : ''}
              className="gap-2"
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
                : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}