import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Boxes, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MoodleParameterButton from '@/components/einheiten/MoodleParameterButton';

/** Die Übungsblöcke EINER Einheit. */
export default function FachBloeckeListe({ bloecke = [] }) {
  const [loeschZiel, setLoeschZiel] = useState(null);
  const queryClient = useQueryClient();

  const loeschen = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('deleteEinheitSecure', { einheit_id: id });
      if (res?.data?.error) throw new Error(res.data.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      setLoeschZiel(null);
      toast.success('Übungsblock gelöscht.');
    },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });

  if (bloecke.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Noch keine Übungsblöcke.</p>;
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {bloecke.map((b) => (
          <div
            key={b.id}
            className="group relative flex items-center gap-2 rounded-lg border border-border bg-card pl-3 pr-1 py-2 hover:bg-muted/50 transition-colors"
          >
            <Boxes className="w-4 h-4 text-violet-600 shrink-0" />
            <Link to={`/workspace?einheit=${b.id}`} className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{b.titel_der_einheit || 'Ohne Titel'}</p>
              <p className="text-[11px] text-muted-foreground">
                {b.last_exported_at ? 'in Moodle' : 'Entwurf'}
              </p>
            </Link>
            <MoodleParameterButton einheit={b} />
            <button
              type="button"
              onClick={() => setLoeschZiel(b)}
              title="Übungsblock löschen"
              className="p-1.5 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mr-1" />
          </div>
        ))}
      </div>

      <AlertDialog open={!!loeschZiel} onOpenChange={(o) => { if (!o) setLoeschZiel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Übungsblock löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{loeschZiel?.titel_der_einheit}" wird mit allem Inhalt gelöscht — Themenfeld,
              Lernpakete und Aufgaben. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); loeschen.mutate(loeschZiel.id); }}
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