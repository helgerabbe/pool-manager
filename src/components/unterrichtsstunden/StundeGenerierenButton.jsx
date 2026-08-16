import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Wand2, AlertTriangle } from 'lucide-react';
import { eindeutigeCodes, normalisierterTyp, standardSchuelerAnweisung } from '@/lib/stundenPhasen';

/**
 * Setzt die Bauanleitung des Coaches in echte Stunden-Phasen (StundenSequenz)
 * um. Die Bauanleitung selbst bleibt IMMER erhalten und kann später erneut
 * angepasst und neu umgesetzt werden.
 */
export default function StundeGenerierenButton({ stunde, plan, hatPhasen }) {
  const [bestaetigen, setBestaetigen] = useState(false);
  const queryClient = useQueryClient();
  const verlaufsplan = plan?.verlaufsplan || [];

  const generieren = useMutation({
    mutationFn: async () => {
      const alte = await base44.entities.StundenSequenz.filter({ stunde_id: stunde.id }, 'reihenfolge', 100);
      for (const p of alte) {
        await base44.entities.StundenSequenz.delete(p.id);
      }
      const codes = eindeutigeCodes(verlaufsplan.length, [stunde.notfall_code]);
      await base44.entities.StundenSequenz.bulkCreate(
        verlaufsplan.map((p, idx) => ({
          stunde_id: stunde.id,
          reihenfolge: idx,
          phasenname: p.phasenname || `Phase ${idx + 1}`,
          typ: normalisierterTyp(p.typ),
          schueler_anweisung: standardSchuelerAnweisung(p.typ),
          dauer_minuten: Number(p.zeit_minuten) || undefined,
          lehrer_hinweis: p.inhalt || '',
          methode_sozialform: p.methode_sozialform || '',
          material_hinweis: p.material || '',
          freischalt_code: codes[idx],
          is_complete: false,
        }))
      );
      await base44.entities.Unterrichtsstunde.update(stunde.id, {
        stundenziel: plan?.steckbrief?.leitziel || stunde.stundenziel || '',
        coach_plan_umgesetzt_am: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setBestaetigen(false);
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stunde.id] });
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunde', stunde.id] });
    },
  });

  if (verlaufsplan.length === 0) return null;

  return (
    <div className="space-y-2">
      {generieren.isError && (
        <p className="text-sm text-destructive">{generieren.error?.message || 'Umsetzung fehlgeschlagen.'}</p>
      )}
      {hatPhasen && bestaetigen ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm text-foreground inline-flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" />
            Die bestehenden Phasen dieser Stunde werden durch die aktuelle Bauanleitung ersetzt (neue Freischalt-Codes).
            Die Bauanleitung selbst bleibt erhalten.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => generieren.mutate()} disabled={generieren.isPending}>
              Phasen neu aufbauen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBestaetigen(false)}>Abbrechen</Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => (hatPhasen ? setBestaetigen(true) : generieren.mutate())}
          disabled={generieren.isPending}
          className="gap-2"
        >
          {generieren.isPending
            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Wand2 className="w-4 h-4" />}
          {hatPhasen ? 'Unterrichtsstunde neu generieren' : 'Unterrichtsstunde generieren'}
        </Button>
      )}
    </div>
  );
}