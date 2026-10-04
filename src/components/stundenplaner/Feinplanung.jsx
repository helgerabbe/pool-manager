import React from 'react';
import { Wand2, Lightbulb, BookOpen } from 'lucide-react';
import FesteMaterialien from './FesteMaterialien';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FEINPLANUNG } from '@/lib/stundenplanerVorschauDaten';
import InternetVertiefenButton from './InternetVertiefenButton';

/** Schritt 5: Aktivität je Phase mit Begründung, dann Übernahme. */
export default function Feinplanung() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Für jede Phase wählen wir eine Methode aus unserem Katalog, sagen, was die Schüler tun, und begründen es.</p>
      <ol className="space-y-2">
        {FEINPLANUNG.map((p, i) => (
          <li key={i} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{p.phase}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />{p.methode}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{p.umsetzung}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Aufgabe: {p.aktivitaet}</p>
            <p className="mt-1.5 text-xs">{p.ablauf}</p>
            <p className="mt-1 flex gap-2 text-xs"><Lightbulb className="h-3.5 w-3.5 shrink-0 text-accent" />{p.begruendung}</p>
          </li>
        ))}
      </ol>
      <FesteMaterialien />
      <InternetVertiefenButton text="Im Internet nach passenden Materialien und Aufgabenideen suchen und zur Liste hinzufügen" />
      <Button className="gap-2" onClick={() => toast.info('In der Vorschau wird noch keine Stunde angelegt.')}>
        <Wand2 className="h-4 w-4" /> Stunde mit Aufgaben anlegen
      </Button>
    </div>
  );
}