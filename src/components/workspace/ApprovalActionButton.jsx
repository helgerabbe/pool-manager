import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalActionButton({ entityId, entityType, syncStatus, kannBearbeiten, userRole }) {
  const queryClient = useQueryClient();
  const isApproved = syncStatus === 'approved';
  const isModified = syncStatus === 'modified';
  const isDraft = syncStatus === 'draft';
  
  // Nur globale Admins und Fachschaftsleitungen dürfen freigeben/entziehen
  const canApprove = userRole && ['Administrator', 'Fachschaftsleitung'].includes(userRole);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (entityType === 'activity') {
        return base44.entities.LernpaketPhaseAktivitaet.update(entityId, { sync_status: 'approved' });
      } else if (entityType === 'klon') {
        return base44.entities.Aufgabenbausteine.update(entityId, { sync_status: 'approved' });
      } else if (entityType === 'master') {
        return base44.entities.MasterAufgabe.update(entityId, { sync_status: 'approved' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.success('✓ ' + (entityType === 'activity' ? 'Aktivität' : entityType === 'klon' ? 'Klon' : 'Master') + ' freigegeben. Im Export-Center sichtbar.');
    },
    onError: (err) => {
      toast.error('Fehler beim Freigeben: ' + err.message);
    }
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (entityType === 'activity') {
        return base44.entities.LernpaketPhaseAktivitaet.update(entityId, { sync_status: 'draft' });
      } else if (entityType === 'klon') {
        return base44.entities.Aufgabenbausteine.update(entityId, { sync_status: 'draft' });
      } else if (entityType === 'master') {
        return base44.entities.MasterAufgabe.update(entityId, { sync_status: 'draft' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.info('Status zurückgesetzt auf Entwurf.');
    }
  });

  if (!canApprove) return null;

  if (isApproved) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => reverseMutation.mutate()}
        disabled={reverseMutation.isPending}
        className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
      >
        {reverseMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        Freigabe rückgängig
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="default"
      onClick={() => approveMutation.mutate()}
      disabled={approveMutation.isPending}
      className="gap-2"
    >
      {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      {isModified ? 'Änderungen freigeben' : 'Freigeben'}
    </Button>
  );
}