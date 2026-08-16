import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { KeyRound, KeySquare } from 'lucide-react';

/**
 * Freischalt-Code einer Phase als Haltepunkt an-/abschalten (2026-08-16):
 * Klick auf den Schlüssel deaktiviert die Code-Sperre dieser Phase — die Zahl
 * wird ausgeblendet, der Code bleibt aber gespeichert und kann per Klick
 * jederzeit wieder aktiviert werden. Deaktivierte Phasen erreichen die
 * Schüler:innen ohne Eingabe.
 */
export default function StundenPhaseCodeToggle({ phase, stundeId }) {
  const queryClient = useQueryClient();
  const aus = !!phase.code_deaktiviert;

  const mutation = useMutation({
    mutationFn: () =>
      base44.entities.StundenSequenz.update(phase.id, { code_deaktiviert: !aus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] }),
  });

  if (!phase.freischalt_code) return null;

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title={aus ? 'Haltepunkt aktivieren: Schüler geben den Code ein' : 'Haltepunkt deaktivieren: Phase ohne Code-Eingabe'}
    >
      {aus ? (
        <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
          <KeySquare className="w-3 h-3" />
          <span className="line-through">kein Code</span>
        </Badge>
      ) : (
        <Badge className="font-mono gap-1">
          <KeyRound className="w-3 h-3" />
          {phase.freischalt_code}
        </Badge>
      )}
    </button>
  );
}