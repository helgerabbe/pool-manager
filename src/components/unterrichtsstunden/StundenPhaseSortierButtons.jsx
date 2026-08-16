/**
 * Phase im Regieblatt nach oben/unten schieben bzw. löschen.
 * Die Reihenfolge wird über das Feld 'reihenfolge' getauscht.
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StundenPhaseSortierButtons({ phase, index, anzahl, stundeId }) {
  const queryClient = useQueryClient();
  const aktualisieren = () => queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });

  const verschieben = useMutation({
    mutationFn: async (richtung) => {
      const alle = await base44.entities.StundenSequenz.filter({ stunde_id: stundeId }, 'reihenfolge', 50);
      const pos = alle.findIndex((p) => p.id === phase.id);
      const ziel = pos + richtung;
      if (pos < 0 || ziel < 0 || ziel >= alle.length) return;
      return base44.entities.StundenSequenz.bulkUpdate([
        { id: alle[pos].id, reihenfolge: ziel },
        { id: alle[ziel].id, reihenfolge: pos },
      ]);
    },
    onSuccess: aktualisieren,
    onError: (err) => toast.error(err?.message || 'Die Reihenfolge konnte nicht geändert werden.'),
  });

  const loeschen = useMutation({
    mutationFn: () => base44.entities.StundenSequenz.delete(phase.id),
    onSuccess: () => {
      aktualisieren();
      toast.success('Phase gelöscht.');
    },
    onError: (err) => toast.error(err?.message || 'Die Phase konnte nicht gelöscht werden.'),
  });

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Nach oben"
        disabled={index === 0 || verschieben.isPending}
        onClick={() => verschieben.mutate(-1)}
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Nach unten"
        disabled={index === anzahl - 1 || verschieben.isPending}
        onClick={() => verschieben.mutate(1)}
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-red-600 hover:text-red-700"
        title="Phase löschen"
        disabled={loeschen.isPending}
        onClick={() => {
          if (window.confirm('Diese Phase wirklich löschen?')) loeschen.mutate();
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}