import React from 'react';
import { Wand2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FEINPLANUNG } from '@/lib/stundenplanerVorschauDaten';

/** Schritt 5: Aktivität je Phase mit Begründung, dann Übernahme. */
export default function Feinplanung() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Für jede Phase wähle ich, was die Schüler tun – und begründe es.</p>
      <ol className="space-y-2">
        {FEINPLANUNG.map((p, i) => (
          <li key={i} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{p.phase}</p>
            <p className="text-sm font-semibold">{p.aktivitaet}</p>
            <p className="mt-1 flex gap-2 text-xs"><Lightbulb className="h-3.5 w-3.5 shrink-0 text-accent" />{p.begruendung}</p>
          </li>
        ))}
      </ol>
      <Button className="gap-2" onClick={() => toast.info('In der Vorschau wird noch keine Stunde angelegt.')}>
        <Wand2 className="h-4 w-4" /> Stunde mit Aufgaben anlegen
      </Button>
    </div>
  );
}