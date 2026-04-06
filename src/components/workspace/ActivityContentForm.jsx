import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import StandardInput from '@/components/workspace/inputs/StandardInput';

/**
 * Validiert Formularinhalte basierend auf dem Schema
 * @param {Array} formSchema - Array von Feldkonfigurationen
 * @param {Object} formData - Eingegebene Daten
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateFormData(formSchema, formData) {
  const errors = [];

  formSchema.forEach(field => {
    const value = formData[field.field_name];

    if (field.required) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors.push(`${field.label} ist erforderlich`);
      }

      // Spezielle Validierungen
      if (field.type === 'url' && value) {
        try {
          new URL(value);
        } catch {
          errors.push(`${field.label} ist keine gültige URL`);
        }
      }

      if (field.type === 'textarea' && value && value.trim().length < 10) {
        errors.push(`${field.label} muss mindestens 10 Zeichen enthalten`);
      }

      // Array-Felder (Paare, Fragen)
      if (field.type === 'json' && Array.isArray(value)) {
        if (value.length === 0) {
          errors.push(`${field.label} benötigt mindestens einen Eintrag`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hauptkomponente: ActivityContentForm
 * Modales Fenster zur Befüllung von Aktivitätsinhalten
 */
export default function ActivityContentForm({
  open,
  onOpenChange,
  aktivitaet,
  initialData = {},
  onSave,
}) {
  const [formData, setFormData] = useState(initialData);
  const [fillInMoodleLater, setFillInMoodleLater] = useState(initialData?.fill_in_moodle_later ?? false);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const formSchema = useMemo(() => aktivitaet?.form_schema || [], [aktivitaet]);

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
    // Fehler nur neu berechnen wenn valide, sonst später beim Speichern
    setValidationErrors([]);
  };

  const handleSaveComplete = () => {
    // Vollständig wenn: fill_in_moodle_later ODER alle Pflichtfelder befüllt
    if (fillInMoodleLater) {
      onSave({ content_data: { ...formData, fill_in_moodle_later: true }, is_complete: true });
      onOpenChange(false);
      setIsDirty(false);
      return;
    }
    const validation = validateFormData(formSchema, formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    onSave({ content_data: { ...formData, fill_in_moodle_later: false }, is_complete: true });
    onOpenChange(false);
    setIsDirty(false);
  };

  const handleSaveDraft = () => {
    onSave({ content_data: { ...formData, fill_in_moodle_later: fillInMoodleLater }, is_complete: fillInMoodleLater });
    onOpenChange(false);
    setIsDirty(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {aktivitaet?.name || 'Aktivität konfigurieren'}
          </DialogTitle>
        </DialogHeader>

        {/* Validierungsfehler */}
        {validationErrors.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Bitte füllen Sie alle Pflichtfelder aus:</p>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* "In Moodle befüllen"-Checkbox */}
        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
          fillInMoodleLater ? 'border-blue-300 bg-blue-50' : 'border-border bg-muted/30'
        }`}>
          <input
            type="checkbox"
            checked={fillInMoodleLater}
            onChange={e => { setFillInMoodleLater(e.target.checked); setIsDirty(true); setValidationErrors([]); }}
            className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
          />
          <div>
            <p className={`text-sm font-semibold ${fillInMoodleLater ? 'text-blue-800' : 'text-foreground'}`}>
              <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
              Inhalt erst direkt in Moodle ergänzen
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Die Aktivität gilt als vollständig – der Inhalt wird später in Moodle eingepflegt.
            </p>
          </div>
        </label>

        {/* Formularfelder (ausgegraut wenn fill_in_moodle_later) */}
        <div className={`space-y-5 py-4 ${fillInMoodleLater ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {/* Aufgabenstellung – oben als erstes mit blauem Hintergrund */}
          {formData.task_description ? (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-blue-900">Aufgabenstellung</p>
                <button
                  type="button"
                  onClick={() => handleFieldChange('task_description', '')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Anpassen
                </button>
              </div>
              <p className="text-sm text-blue-800">{formData.task_description}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Aufgabenstellung <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                value={formData.task_description || ''}
                onChange={e => handleFieldChange('task_description', e.target.value)}
                placeholder="Beschreibe hier kurz, was der Schüler tun soll..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          {formSchema.length === 0 ? (
            <div className="p-6 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              Keine weiteren Formularfelder definiert.
            </div>
          ) : (
            formSchema.map(field => {
              // Bedingte Anzeige: inhalt nur wenn inhalt_typ === 'text', dokument_url nur wenn 'datei'
              const inhaltTyp = formData.inhalt_typ;
              if (field.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return null;
              if (field.field_name === 'dokument_url' && inhaltTyp !== 'datei') return null;

              return (
                <div key={field.field_name} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>

                  {field.type === 'info' ? (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      {field.label}
                    </div>
                  ) : (
                    <StandardInput
                      field={field}
                      value={formData[field.field_name] || ''}
                      onChange={(value) => handleFieldChange(field.field_name, value)}
                    />
                  )}

                  {field.placeholder && !field.required && (
                    <p className="text-xs text-muted-foreground italic">{field.placeholder}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Speicher-Buttons */}
        <DialogFooter className="flex gap-3 justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDirty}
          >
            Abbrechen
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSaveDraft}
              className="gap-2"
            >
              <Clock className="w-4 h-4" /> Später ausfüllen
            </Button>

            <Button
              type="button"
              onClick={handleSaveComplete}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" /> Speichern & Fertig
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}