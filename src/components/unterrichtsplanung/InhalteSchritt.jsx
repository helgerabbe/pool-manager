import React from 'react';
import { Loader2, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InhaltZeile from './InhaltZeile';
import ZeitbudgetFeld from './ZeitbudgetFeld';

/** Schritt 2: Inhalte priorisieren, Zeitbudget angeben, Verlauf planen lassen. */
export default function InhalteSchritt({ planung, speichern, planen }) {
  const inhalte = planung.inhalte || [];
  const setze = (id, prioritaet) =>
    speichern.mutate({ inhalte: inhalte.map((i) => (i.id === id ? { ...i, prioritaet } : i)) });
  const muss = inhalte.filter((i) => i.prioritaet === 'muss').reduce((s, i) => s + (i.minuten || 0), 0);
  const budget = (planung.einzelstunden || 0) * 40 + (planung.doppelstunden || 0) * 85;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">2 · Inhalte auswählen</h2>
        <p className="text-xs text-muted-foreground">
          Mögliche Inhalte aus der Recherche. Lege fest, was unbedingt rein muss, was optional ist und was raus kann.
        </p>
      </div>
      <div className="space-y-2">
        {inhalte.map((i) => <InhaltZeile key={i.id} inhalt={i} onPrioritaet={(p) => setze(i.id, p)} />)}
      </div>
      <ZeitbudgetFeld planung={planung} onSpeichern={(d) => speichern.mutate(d)} />
      {budget > 0 && muss > budget && (
        <p className="text-xs text-destructive">Die „Muss“-Inhalte brauchen geschätzt {muss} Min. — mehr als deine {budget} Min.</p>
      )}
      <Button
        onClick={() => planen.mutate({ planung_id: planung.id })}
        disabled={planen.isPending || speichern.isPending || budget === 0}
        className="gap-2"
      >
        {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
        {planung.verlauf?.length ? 'Verlauf neu planen' : 'Verlauf planen'}
      </Button>
    </section>
  );
}