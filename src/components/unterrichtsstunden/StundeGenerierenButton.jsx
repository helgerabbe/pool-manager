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

  const [status, setStatus] = useState('');
  const [meldungen, setMeldungen] = useState([]);

  const generieren = useMutation({
    mutationFn: async () => {
      setMeldungen([]);
      const katalog = await base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'name', 200);
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

      // ── Digitale Aufgaben mit erstellen (nur wo die Lehrkraft es will) ──
      const neuePhasen = await base44.entities.StundenSequenz.filter({ stunde_id: stunde.id }, 'reihenfolge', 100);
      const notizen = [];
      for (let idx = 0; idx < verlaufsplan.length; idx++) {
        const p = verlaufsplan[idx];
        if (p.ki_erstellen !== true) continue;
        const phase = neuePhasen[idx];
        const kat = katalog.find((k) => k.name === p.ki_aktivitaet);
        if (!phase) continue;
        if (!kat) {
          notizen.push(`${p.phasenname}: keine Aufgabenart ausgewählt — bitte im Regieblatt ergänzen.`);
          continue;
        }
        setStatus(`Aufgabe für „${p.phasenname}" wird erstellt…`);
        await base44.entities.StundenSequenz.update(phase.id, { aktivitaet_id: kat.id });
        const res = await base44.functions.invoke('generateStundenAufgabe', {
          stunde_id: stunde.id,
          phase_id: phase.id,
          hinweis: p.ki_hinweis || '',
        });
        const d = res?.data || {};
        if (!d.success) {
          notizen.push(`${p.phasenname}: ${d.reason || d.error || 'Aufgabe konnte nicht erstellt werden.'}`);
        }
      }
      setStatus('');
      setMeldungen(notizen);
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
      {generieren.isPending && status && <p className="text-sm text-muted-foreground">{status}</p>}
      {meldungen.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-900">
            Diese digitalen Aufgaben müssen Sie im Regieblatt selbst ausarbeiten:
          </p>
          {meldungen.map((m, i) => (
            <p key={i} className="text-xs text-amber-900/90">{m}</p>
          ))}
        </div>
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