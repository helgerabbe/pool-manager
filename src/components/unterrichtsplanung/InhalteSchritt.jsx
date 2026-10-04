import React from 'react';
import { Loader2, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InhaltZeile from './InhaltZeile';
import KcAbdeckung from './KcAbdeckung';

/** Schritt 2: Inhalte priorisieren, Verlauf planen lassen. */
export default function InhalteSchritt({ planung, speichern, planen, onFertig }) {
  const inhalte = planung.inhalte || [];
  const setze = (id, prioritaet) =>
    speichern.mutate({ inhalte: inhalte.map((i) => (i.id === id ? { ...i, prioritaet } : i)) });

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
      <KcAbdeckung inhalte={inhalte} />
      <p className="text-xs text-muted-foreground">
        {planen.isPending
          ? 'Der Verlauf wird geplant … das kann ein bis zwei Minuten dauern. Bitte die Seite geöffnet lassen.'
          : 'Achtung: Das Planen des Verlaufs kann etwas länger dauern (ein bis zwei Minuten).'}
      </p>
      <Button
        onClick={() => planen.mutate({ planung_id: planung.id }, { onSuccess: onFertig })}
        disabled={planen.isPending || speichern.isPending}
        className="gap-2"
      >
        {planen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
        {planung.verlauf?.length ? 'Verlauf neu planen' : 'Verlauf planen'}
      </Button>
    </section>
  );
}