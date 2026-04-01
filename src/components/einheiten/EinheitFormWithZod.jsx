/**
 * EinheitFormWithZod.jsx
 *
 * Phase 6.6: Einheit-Formular mit react-hook-form + Zod
 * 
 * Features:
 * - Zod-basierte Validierung mit aussagekräftigen Error-Messages
 * - Field-Level Errors inline angezeigt
 * - Submit nur wenn Validierung erfolgreich
 * - State Machine für Status-Übergänge
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { secureApi, SecureApiError } from '@/api/secureApi';
import { EinheitCreateSchema, SchemaHelpers } from '@/utils/validationSchemas';
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
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EinheitFormWithZod({ open, onOpenChange, initialData = null, onSuccess }) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(EinheitCreateSchema),
    defaultValues: {
      titel_der_einheit: initialData?.titel_der_einheit || '',
      fach: initialData?.fach || '',
      jahrgangsstufe: initialData?.jahrgangsstufe || '',
      gesamtziel: initialData?.gesamtziel || '',
      freigabe_status: initialData?.freigabe_status || 'In Planung',
    },
  });

  const currentStatus = watch('freigabe_status');
  const allowedStatuses = initialData?.freigabe_status
    ? getAllowedTransitions(initialData.freigabe_status)
    : ['In Planung', 'Freigegeben für Moodle'];

  // Reset form wenn Dialog öffnet/schließt
  useEffect(() => {
    if (open && initialData) {
      reset({
        titel_der_einheit: initialData.titel_der_einheit || '',
        fach: initialData.fach || '',
        jahrgangsstufe: initialData.jahrgangsstufe || '',
        gesamtziel: initialData.gesamtziel || '',
        freigabe_status: initialData.freigabe_status || 'In Planung',
      });
    } else if (open) {
      reset({
        titel_der_einheit: '',
        fach: '',
        jahrgangsstufe: '',
        gesamtziel: '',
        freigabe_status: 'In Planung',
      });
    }
  }, [open, initialData, reset]);

  // Mutation für Create/Update
  const mutation = useMutation({
    mutationFn: async (data) => {
      if (initialData?.id) {
        return secureApi.updateEinheit(initialData.id, data, initialData);
      } else {
        return secureApi.createEinheit(data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success(initialData?.id ? 'Einheit aktualisiert' : 'Einheit erstellt');
      onOpenChange(false);
      if (onSuccess) onSuccess(result);
    },
    onError: (error) => {
      if (error instanceof SecureApiError) {
        toast.error(error.message);
      } else {
        toast.error('Ein Fehler ist aufgetreten');
      }
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  const FormField = ({ label, name, type = 'text', placeholder, required = true, children }) => {
    const error = errors[name];

    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {children ? (
          children
        ) : (
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            {...register(name)}
            className={error ? 'border-red-300 bg-red-50' : ''}
          />
        )}

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Einheit bearbeiten' : 'Neue Einheit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Titel */}
          <FormField label="Titel der Einheit" name="titel_der_einheit" placeholder="z.B. Grundrechenarten" />

          {/* Fach */}
          <FormField label="Fach" name="fach">
            <select
              {...register('fach')}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.fach ? 'border-red-300 bg-red-50' : 'border-input hover:border-primary/40'
              }`}
            >
              <option value="">-- Bitte wählen --</option>
              {SchemaHelpers.getFaecher().map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {errors.fach && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.fach.message}</span>
              </div>
            )}
          </FormField>

          {/* Jahrgangsstufe */}
          <FormField label="Jahrgangsstufe" name="jahrgangsstufe">
            <select
              {...register('jahrgangsstufe')}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                errors.jahrgangsstufe ? 'border-red-300 bg-red-50' : 'border-input hover:border-primary/40'
              }`}
            >
              <option value="">-- Bitte wählen --</option>
              {SchemaHelpers.getJahrgaenge().map((j) => (
                <option key={j} value={j}>
                  Jahrgang {j}
                </option>
              ))}
            </select>
            {errors.jahrgangsstufe && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.jahrgangsstufe.message}</span>
              </div>
            )}
          </FormField>

          {/* Gesamtziel (optional) */}
          <FormField label="Gesamtziel" name="gesamtziel" placeholder="Übergeordnetes Lernziel..." required={false}>
            <textarea
              {...register('gesamtziel')}
              className={`w-full px-3 py-2 rounded-lg border transition-colors resize-none ${
                errors.gesamtziel ? 'border-red-300 bg-red-50' : 'border-input hover:border-primary/40'
              }`}
              rows="3"
              placeholder="Übergeordnetes Lernziel..."
            />
            {errors.gesamtziel && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.gesamtziel.message}</span>
              </div>
            )}
          </FormField>

          {/* Status (mit State Machine) */}
          {initialData?.id && (
            <FormField label="Status" name="freigabe_status">
              <select
                {...register('freigabe_status')}
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
            </FormField>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending || isSubmitting ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}