/**
 * Löschen einer privaten Unterrichtsstunde (inkl. aller Phasen).
 * Nur der Besitzer sieht den Button in seiner Privaten Bibliothek.
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function StundeLoeschenButton({ stunde, onDeleted }) {
  const [offen, setOffen] = React.useState(false);
  const queryClient = useQueryClient();

  const loeschen = useMutation({
    mutationFn: async () => {
      const phasen = await base44.entities.StundenSequenz.filter({ stunde_id: stunde.id }, 'reihenfolge', 200);
      for (const p of phasen) {
        await base44.entities.StundenSequenz.delete(p.id);
      }
      await base44.entities.Unterrichtsstunde.delete(stunde.id);
    },
    onSuccess: () => {
      setOffen(false);
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunden'] });
      toast.success('Unterrichtsstunde gelöscht.');
      onDeleted?.();
    },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        title="Unterrichtsstunde löschen"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOffen(true);
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <AlertDialog open={offen} onOpenChange={setOffen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unterrichtsstunde löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{stunde.arbeitstitel}" wird mit allen Phasen, Codes und Materialverweisen endgültig gelöscht.
              Die zugehörige Einheit bleibt erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loeschen.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                loeschen.mutate();
              }}
              disabled={loeschen.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loeschen.isPending ? 'Wird gelöscht…' : 'Endgültig löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}