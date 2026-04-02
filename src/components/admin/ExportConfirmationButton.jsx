/**
 * ExportConfirmationButton.jsx
 * 
 * Admin-Button zur Bestätigung des Moodle-Exports.
 * Ruft confirmExportCompletion auf und aktualisiert alle 'pending' → 'synced'.
 * 
 * Nur für Admins sichtbar.
 */

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExportConfirmationButton({ einheitId, userRole, className = '' }) {
  const queryClient = useQueryClient();

  // ──────────────────────────────────────────────────────────────────────────────
  // Mutation: Bestätige Export (pending → synced)
  // ──────────────────────────────────────────────────────────────────────────────

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('confirmExportCompletion', {
        einheit_id: einheitId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidiere alle relevanten Queries → Frontend aktualisiert sich automatisch
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });

      toast.success(data.message);
    },
    onError: (err) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Nur für Admins
  // ──────────────────────────────────────────────────────────────────────────────

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Button
      onClick={() => confirmMutation.mutate()}
      disabled={confirmMutation.isPending}
      className={`gap-2 bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      {confirmMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Bestätigung lädt…
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          ✓ Export-Abschluss bestätigen
        </>
      )}
    </Button>
  );
}