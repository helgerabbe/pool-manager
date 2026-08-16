/**
 * Neue Phase manuell an das Ende des Regieblatts anhängen (ohne KI-Generator).
 * Die Reihenfolge lässt sich danach mit den Pfeilen der Phasen-Karte ändern.
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { eindeutigeCodes, standardSchuelerAnweisung } from '@/lib/stundenPhasen';

export default function StundenPhaseHinzufuegenButton({ stundeId, phasen }) {
  const queryClient = useQueryClient();

  const anlegen = useMutation({
    mutationFn: () => {
      const [code] = eindeutigeCodes(1, phasen.map((p) => p.freischalt_code));
      return base44.entities.StundenSequenz.create({
        stunde_id: stundeId,
        reihenfolge: phasen.length,
        phasenname: `Phase ${phasen.length + 1}`,
        typ: 'analog_input',
        schueler_anweisung: standardSchuelerAnweisung('analog_input'),
        freischalt_code: code,
        is_complete: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
      toast.success('Neue Phase angelegt.');
    },
    onError: (err) => toast.error(err?.message || 'Die Phase konnte nicht angelegt werden.'),
  });

  return (
    <Button variant="outline" className="gap-2 w-full" onClick={() => anlegen.mutate()} disabled={anlegen.isPending}>
      <Plus className="w-4 h-4" />
      {anlegen.isPending ? 'Wird angelegt…' : 'Neue Phase einfügen'}
    </Button>
  );
}