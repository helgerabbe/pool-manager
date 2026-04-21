/**
 * TextLesenModal.jsx
 *
 * Modal für die Bearbeitung von Aktivitäten ohne supports_master (z.B. "Text lesen").
 * Öffnet sich nur nach erfolgreichem Lock-Erwerb.
 * Footer: Abbrechen (unlock + schließen) | Speichern (save + unlock + schließen)
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import StandardInput from '@/components/workspace/inputs/StandardInput';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';

export default function TextLesenModal({
  open,
  onOpenChange,
  catalogEntry,
  initialFieldValues = {},
  onSave,        // (fieldValues) => Promise — speichert + gibt Lock frei
  onCancel,      // () => Promise — gibt Lock frei ohne zu speichern
  isSaving = false,
}) {
  const [fieldValues, setFieldValues] = useState(initialFieldValues);
  const [isReleased, setIsReleased] = useState(initialFieldValues.content_status === 'approved');

  // Bei jedem Öffnen Initialwerte neu laden
  useEffect(() => {
    if (open) {
      setFieldValues(initialFieldValues);
      setIsReleased(initialFieldValues.content_status === 'approved');
    }
  }, [open]);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleSave = () => {
    onSave?.({ ...fieldValues, content_status: isReleased ? 'approved' : 'draft' });
  };

  const formSchema = catalogEntry?.form_schema || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {catalogEntry?.name || 'Inhalt bearbeiten'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inhalt wird nach dem Speichern automatisch freigegeben.
          </p>
        </DialogHeader>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {/* Aufgabenstellung zuerst */}
          {formSchema.find(f => f.field_name === 'aufgabentext') && (
            <div className="space-y-1.5">
              <Label>Aufgabenstellung</Label>
              <textarea
                value={fieldValues.aufgabentext || ''}
                onChange={e => handleFieldChange('aufgabentext', e.target.value)}
                placeholder={formSchema.find(f => f.field_name === 'aufgabentext')?.placeholder || 'Aufgabenstellung...'}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Alle anderen Felder aus dem Schema */}
          {formSchema.map(field => {
            if (field.field_name === 'aufgabentext') return null;

            // Bedingte Anzeige: inhalt nur wenn inhalt_typ === 'text', dokument_url nur wenn 'datei'
            const inhaltTyp = fieldValues?.inhalt_typ;
            if (field.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return null;
            if (field.field_name === 'dokument_url' && inhaltTyp !== 'datei') return null;

            if (field.type === 'info') {
              return (
                <div key={field.field_name} className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  {field.label}
                </div>
              );
            }

            return (
              <div key={field.field_name} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <StandardInput
                  field={field}
                  value={fieldValues[field.field_name] || ''}
                  onChange={(val) => handleFieldChange(field.field_name, val)}
                />
              </div>
            );
          })}
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
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
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