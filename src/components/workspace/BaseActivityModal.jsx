import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';

export default function BaseActivityModal({ 
  open, 
  onOpenChange, 
  title, 
  initialData = {}, 
  onSave, 
  onDelete, 
  isSaving = false, 
  isCopy = false, 
  exportLocked = false,
  children 
}) {
  const [isReleased, setIsReleased] = useState(initialData.content_status === 'approved');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    onSave({ content_status: isReleased ? 'approved' : 'draft' });
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

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        <div className="px-6 py-5 border-t border-border shrink-0 space-y-4">
          <ReleaseStatusToggle
            isReleased={isReleased}
            onToggle={setIsReleased}
            disabled={isSaving || isDeleting}
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {onDelete && !deleteConfirm && (
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
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSaving || isDeleting}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isDeleting || exportLocked} className="gap-2">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}