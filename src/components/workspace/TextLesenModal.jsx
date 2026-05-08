/**
 * TextLesenModal.jsx
 *
 * Modal für die Bearbeitung von Aktivitäten ohne supports_master (z.B. "Text lesen").
 * Öffnet sich nur nach erfolgreichem Lock-Erwerb.
 * Footer: Abbrechen (unlock + schließen) | Speichern (save + unlock + schließen)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import StandardInput from '@/components/workspace/inputs/StandardInput';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import TranskriptField, { shouldShowTranskript } from '@/components/workspace/ki/TranskriptField';

export default function TextLesenModal({
  open,
  onOpenChange,
  catalogEntry,
  initialFieldValues = {},
  onSave,        // (fieldValues) => Promise — speichert + gibt Lock frei
  onCancel,      // () => Promise — gibt Lock frei ohne zu speichern
  onReset,       // () => Promise — setzt Aktivitäts-Inhalte zurück (Aktivität bleibt erhalten)
  isSaving = false,
  exportLocked = false,  // Wird bei Export-Lock deaktiviert
}) {
  const [fieldValues, setFieldValues] = useState(initialFieldValues);
  const [isReleased, setIsReleased] = useState(initialFieldValues.content_status === 'approved');
  const [exportLockedWasEnabled, setExportLockedWasEnabled] = useState(exportLocked);

  // Nur beim ÖFFNEN des Modals Initialwerte laden (nicht bei jedem Re-render)
  // initialFieldValues NICHT als Dependency — das ist ein neues Objekt bei jedem Parent-Render
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Modal wurde gerade geöffnet → Werte initialisieren
      setFieldValues(JSON.parse(JSON.stringify(initialFieldValues || {})));
      setIsReleased(initialFieldValues?.content_status === 'approved');
      setExportLockedWasEnabled(exportLocked);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Reagiere auf Export-Lock-Änderung während Modal geöffnet ist
  useEffect(() => {
    if (exportLocked && !exportLockedWasEnabled) {
      setExportLockedWasEnabled(true); // Nur einmalig zeigen
    }
  }, [exportLocked, exportLockedWasEnabled]);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleSave = () => {
    // Auto-Reset bei Export: Wenn bereits synced, markiere als modified für Re-Export
    const payload = {
      ...fieldValues,
      content_status: isReleased ? 'approved' : 'draft',
    };

    // Wenn gerade aus 'synced' Status kommt und jetzt geändert wird,
    // markiere automatisch für Re-Export
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }

    onSave?.(payload);
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
           {/* Bildbeschriftungs-Editor (wenn Aktivität vom Typ ist) */}
           {catalogEntry?.name?.toLowerCase().includes('bildbeschriftung') && (
             <ImageLabelingEditor
               initialData={fieldValues}
               onChange={(newData) => setFieldValues(prev => ({ ...prev, ...newData }))}
               readOnly={false}
               hideInternalFooter
             />
           )}

           {/* Rest der Felder: nur wenn NICHT Bildbeschriftung */}
           {!catalogEntry?.name?.toLowerCase().includes('bildbeschriftung') && (
             <>
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

          {/* Reihenfolge: Aufgabenstellung (oben) → Medientyp → Link/URL → Transkript → Rest.
              Wir sortieren das form_schema dafür hier um, damit die didaktische Logik
              (erst die Auswahl der Medienart, dann die Quelle, dann das Transkript dazu)
              für die Lehrkraft sichtbar wird. */}
          {(() => {
            const inhaltTyp = fieldValues?.inhalt_typ;
            const isFieldVisible = (f) => {
              if (f.field_name === 'aufgabentext') return false; // schon oben gerendert
              if (f.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return false;
              if (f.field_name === 'dokument_url' && inhaltTyp !== 'datei') return false;
              return true;
            };

            const ORDER_PREFIX = ['medientyp', 'url'];
            const sortedFields = [...formSchema].filter(isFieldVisible).sort((a, b) => {
              const ai = ORDER_PREFIX.indexOf(a.field_name);
              const bi = ORDER_PREFIX.indexOf(b.field_name);
              const aRank = ai === -1 ? ORDER_PREFIX.length : ai;
              const bRank = bi === -1 ? ORDER_PREFIX.length : bi;
              return aRank - bRank;
            });

            const showTranskript = shouldShowTranskript(catalogEntry?.name);
            const transkriptInserted = !showTranskript;
            const out = [];

            sortedFields.forEach((field) => {
              if (field.type === 'info') {
                out.push(
                  <div key={field.field_name} className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                    {field.label}
                  </div>
                );
              } else {
                out.push(
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
              }

              // Transkript direkt NACH dem url-Feld einfügen — dann steht es
              // unter Medientyp + Link/URL und vor allen sonstigen Feldern.
              if (showTranskript && field.field_name === 'url') {
                out.push(
                  <TranskriptField
                    key="__transkript__"
                    value={fieldValues.transkript || ''}
                    onChange={(val) => handleFieldChange('transkript', val)}
                    disabled={isSaving || exportLocked}
                    sourceUrl={fieldValues.url || ''}
                  />
                );
              }
            });

            // Fallback: wenn die Aktivität kein url-Feld hat, Transkript ans Ende.
            if (showTranskript && !sortedFields.some(f => f.field_name === 'url')) {
              out.push(
                <TranskriptField
                  key="__transkript_fallback__"
                  value={fieldValues.transkript || ''}
                  onChange={(val) => handleFieldChange('transkript', val)}
                  disabled={isSaving || exportLocked}
                  sourceUrl={fieldValues.url || ''}
                />
              );
            }

            return out;
          })()}
             </>
            )}
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
           <div className="flex items-center justify-between gap-3 flex-wrap">
             <div className="flex items-center gap-2">
               {onReset && (
                 <ActivityResetButton
                   onReset={onReset}
                   disabled={isSaving || exportLocked}
                 />
               )}
             </div>
             <div className="flex items-center gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}