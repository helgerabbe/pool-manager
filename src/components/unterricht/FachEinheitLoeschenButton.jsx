import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Löschen einer LEEREN Einheit.
 *
 * Der Knopf erscheint nur, wenn weder Unterrichtsstunden noch Übungsblöcke
 * darin liegen — sonst würde ein Klick Arbeit mitreißen, die woanders steht.
 */
export default function FachEinheitLoeschenButton({ einheit }) {
  const [offen, setOffen] = useState(false);
  const queryClient = useQueryClient();

  const loeschen = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('deleteEinheitSecure', { einheit_id: einheit.id });
      if (res?.data?.error) throw new Error(res.data.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      setOffen(false);
      toast.success('Einheit gelöscht.');
    },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Leere Einheit löschen"
        className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <AlertDialog open={offen} onOpenChange={setOffen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{einheit.titel_der_einheit}" ist leer — es liegen keine Unterrichtsstunden und keine
              Übungsblöcke darin. Die Einheit wird endgültig gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); loeschen.mutate(); }}
              disabled={loeschen.isPending}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {loeschen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Ja, löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}