import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_FIELDS = ['titel', 'aufgabenstellung'];

export default function PublishProjektaufgabeButton({ aufgabe, kannBearbeiten = false }) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const validateAufgabe = () => {
    const missing = [];

    for (const field of REQUIRED_FIELDS) {
      const value = aufgabe[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        missing.push(field);
      }
    }

    return missing;
  };

  const publishMutation = useMutation({
    mutationFn: async (dataToPublish) => {
      return base44.entities.AllgemeineAufgabe.update(aufgabe.id, dataToPublish);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projektaufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Projektaufgabe freigegeben');
      setShowWarning(false);
    },
    onError: () => {
      toast.error('Fehler beim Speichern');
    },
  });

  const handlePublish = () => {
    const missing = validateAufgabe();

    if (missing.length > 0) {
      setMissingFields(missing);
      setShowWarning(true);
      return;
    }

    publishMutation.mutate({ content_status: 'approved' });
  };

  const handleForcePublish = () => {
    const dataToPublish = {
      content_status: 'approved',
      titel: aufgabe.titel || 'Projektaufgabe ohne Titel',
      aufgabenstellung: aufgabe.aufgabenstellung || 'Aufgabenstellung folgt',
    };

    publishMutation.mutate(dataToPublish);
  };

  const isAlreadyApproved = aufgabe.content_status === 'approved';

  if (!kannBearbeiten || isAlreadyApproved) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handlePublish}
        disabled={publishMutation.isPending}
        className="gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        {publishMutation.isPending ? 'Wird freigegeben...' : 'Freigeben'}
      </Button>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projektaufgabe mit Standardwerten freigeben?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Es fehlen folgende Pflichtfelder:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {missingFields.includes('titel') && <li>Titel</li>}
                {missingFields.includes('aufgabenstellung') && <li>Aufgabenstellung</li>}
              </ul>
              <p className="pt-2">
                Diese werden mit Standardwerten gefüllt, damit die Aufgabe exportierbar ist.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleForcePublish} className="bg-primary">
              Ja, freigeben
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}