/**
 * EinheitFormWithValidation.jsx
 *
 * Phase 6.6: Einheit-Form mit Frontend-Validierung & State Machine
 *
 * - Zeigt Field-Level Errors für jedes Feld
 * - Status-Dropdown zeigt nur erlaubte Übergänge
 * - Blockiert Submit wenn Validierung fehlschlägt
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { secureApi, SecureApiError } from '@/api/secureApi';
import { validateEntity, EINHEIT_SCHEMA } from '@/lib/validationSchemas';
import { getAllowedTransitions } from '@/lib/stateMachine';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

const FAECHER = [
  'Deutsch',
  'Mathematik',
  'Englisch',
  'Französisch',
  'Latein',
  'Biologie',
  'Chemie',
  'Physik',
  'Geschichte',
  'Geographie',
  'Politik',
  'Wirtschaft',
  'Kunst',
  'Musik',
  'Sport',
  'Religion',
  'Ethik',
  'Informatik',
];

const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];
const STATUS_OPTIONS = ['In Planung', 'Freigegeben für Moodle'];

export default function EinheitFormWithValidation({ open, onOpenChange, onSubmit, initialData = null }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    titel_der_einheit: '',
    fach: '',
    jahrgangsstufe: '',
    gesamtziel: '',
    freigabe_status: 'In Planung',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Setze initial data wenn vorhanden
  useEffect(() => {
    if (initialData) {
      setFormData({
        titel_der_einheit: initialData.titel_der_einheit || '',
        fach: initialData.fach || '',
        jahrgangsstufe: initialData.jahrgangsstufe || '',
        gesamtziel: initialData.gesamtziel || '',
        freigabe_status: initialData.freigabe_status || 'In Planung',
      });
    } else {
      setFormData({
        titel_der_einheit: '',
        fach: '',
        jahrgangsstufe: '',
        gesamtziel: '',
        freigabe_status: 'In Planung',
      });
    }
    setValidationErrors({});
  }, [initialData, open]);

  // Mutation für Create/Update
  const mutation = useMutation({
    mutationFn: async (data) => {
      if (initialData?.id) {
        // Update
        return secureApi.updateEinheit(initialData.id, data, initialData);
      } else {
        // Create
        return secureApi.createEinheit(data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success(initialData?.id ? 'Einheit aktualisiert' : 'Einheit erstellt');
      onOpenChange(false);
      if (onSubmit) onSubmit(result);
    },
    onError: (error) => {
      if (error instanceof SecureApiError) {
        // Validierungsfehler
        if (error.validationErrors) {
          setValidationErrors(error.validationErrors);
          toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
        } else if (error.status === 400) {
          toast.error(error.message);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Ein Fehler ist aufgetreten');
      }
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Lösche Error für dieses Feld sobald Nutzer es ändert
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend-Validierung
    const validation = validateEntity(formData, EINHEIT_SCHEMA);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    // Submit
    mutation.mutate(formData);
  };

  // State Machine: Erlaubte Status für Dropdown
  const allowedStatuses = initialData?.freigabe_status
    ? getAllowedTransitions(initialData.freigabe_status)
    : STATUS_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Einheit bearbeiten' : 'Neue Einheit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titel */}
          <div className="space-y-2">
            <Label htmlFor="titel">Titel der Einheit *</Label>
            <input
              id="titel"
              type="text"
              value={formData.titel_der_einheit}
              onChange={(e) => handleChange('titel_der_einheit', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                validationErrors.titel_der_einheit
                  ? 'border-red-300 bg-red-50'
                  : 'border-input hover:border-primary/40'
              }`}
              placeholder="z.B. Grundrechenarten"
            />
            {validationErrors.titel_der_einheit && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors.titel_der_einheit}
              </p>
            )}
          </div>

          {/* Fach */}
          <div className="space-y-2">
            <Label htmlFor="fach">Fach *</Label>
            <select
              id="fach"
              value={formData.fach}
              onChange={(e) => handleChange('fach', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                validationErrors.fach ? 'border-red-300 bg-red-50' : 'border-input hover:border-primary/40'
              }`}
            >
              <option value="">-- Bitte wählen --</option>
              {FAECHER.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {validationErrors.fach && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors.fach}
              </p>
            )}
          </div>

          {/* Jahrgang */}
          <div className="space-y-2">
            <Label htmlFor="jahrgangsstufe">Jahrgangsstufe *</Label>
            <select
              id="jahrgangsstufe"
              value={formData.jahrgangsstufe}
              onChange={(e) => handleChange('jahrgangsstufe', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                validationErrors.jahrgangsstufe ? 'border-red-300 bg-red-50' : 'border-input hover:border-primary/40'
              }`}
            >
              <option value="">-- Bitte wählen --</option>
              {JAHRGAENGE.map((j) => (
                <option key={j} value={j}>
                  Jahrgang {j}
                </option>
              ))}
            </select>
            {validationErrors.jahrgangsstufe && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validationErrors.jahrgangsstufe}
              </p>
            )}
          </div>

          {/* Gesamtziel (optional) */}
          <div className="space-y-2">
            <Label htmlFor="gesamtziel">Gesamtziel (optional)</Label>
            <textarea
              id="gesamtziel"
              value={formData.gesamtziel}
              onChange={(e) => handleChange('gesamtziel', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input hover:border-primary/40 transition-colors resize-none"
              placeholder="Übergeordnetes Lernziel..."
              rows="3"
            />
          </div>

          {/* Status (mit State Machine) */}
          {initialData?.id && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.freigabe_status}
                onChange={(e) => handleChange('freigabe_status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input hover:border-primary/40 transition-colors"
              >
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {allowedStatuses.length === 1
                  ? 'Kein Statuswechsel in diesem Zustand möglich'
                  : `${allowedStatuses.length} erlaubte Status`}
              </p>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}