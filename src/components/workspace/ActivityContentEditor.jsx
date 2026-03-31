import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import PairListInput from './inputs/PairListInput';
import GapTextInput from './inputs/GapTextInput';
import QuizInput from './inputs/QuizInput';
import TextbookInput from './inputs/TextbookInput';
import StandardInput from './inputs/StandardInput';

export function checkCompleteness(formSchema, fieldValues) {
  if (!formSchema || !Array.isArray(formSchema)) return true;
  
  return formSchema.every(field => {
    if (!field.required) return true;
    
    const value = fieldValues[field.field_name];
    
    if (field.type === 'pair-list') {
      return Array.isArray(value) && value.length > 0 && 
             value.every(pair => pair.key && pair.value);
    }
    
    if (field.type === 'quiz') {
      return Array.isArray(value) && value.length > 0 &&
             value.every(q => q.frage && Array.isArray(q.antworten) && q.antworten.length > 0);
    }
    
    if (field.type === 'textbook') {
      return value && value.seite && value.nummer;
    }
    
    return value && (typeof value === 'string' ? value.trim().length > 0 : true);
  });
}

export default function ActivityContentEditor({ 
  aktivitaet, 
  currentValues = {}, 
  onSave, 
  onClose 
}) {
  const [fieldValues, setFieldValues] = useState(currentValues);
  const [isComplete, setIsComplete] = useState(true);

  useEffect(() => {
    if (aktivitaet?.form_schema) {
      const complete = checkCompleteness(aktivitaet.form_schema, fieldValues);
      setIsComplete(complete);
    }
  }, [fieldValues, aktivitaet]);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = () => {
    onSave(fieldValues);
  };

  if (!aktivitaet?.form_schema || aktivitaet.form_schema.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Diese Aktivität hat keine konfigurierbaren Felder.</p>
        <Button onClick={handleSave}>Speichern & Schließen</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isComplete && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Einige Pflichtfelder sind noch nicht vollständig. Sie können die Inhalte später ergänzen – die Aktivität wird in Moodle als Platzhalter angelegt.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-5">
        {aktivitaet.form_schema.map(field => (
          <div key={field.field_name} className="space-y-2">
            <label className="block text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Info-Feld */}
            {field.type === 'info' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                {field.placeholder || field.label}
              </div>
            )}

            {/* Paar-Listen (Key/Value) */}
            {field.type === 'pair-list' && (
              <PairListInput
                value={fieldValues[field.field_name] || []}
                onChange={(value) => handleFieldChange(field.field_name, value)}
                placeholder={field.placeholder}
              />
            )}

            {/* Lückentext */}
            {field.type === 'gap-text' && (
              <GapTextInput
                value={fieldValues[field.field_name] || ''}
                onChange={(value) => handleFieldChange(field.field_name, value)}
                placeholder={field.placeholder}
              />
            )}

            {/* Quiz/Test */}
            {field.type === 'quiz' && (
              <QuizInput
                value={fieldValues[field.field_name] || []}
                onChange={(value) => handleFieldChange(field.field_name, value)}
              />
            )}

            {/* Lehrwerk */}
            {field.type === 'textbook' && (
              <TextbookInput
                value={fieldValues[field.field_name] || {}}
                onChange={(value) => handleFieldChange(field.field_name, value)}
              />
            )}

            {/* Standard-Eingaben */}
            {['text', 'textarea', 'url', 'file', 'image', 'audio', 'number', 'select', 'json'].includes(field.type) && (
              <StandardInput
                field={field}
                value={fieldValues[field.field_name] || ''}
                onChange={(value) => handleFieldChange(field.field_name, value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSave}>
          Speichern & Schließen
        </Button>
      </div>
    </div>
  );
}