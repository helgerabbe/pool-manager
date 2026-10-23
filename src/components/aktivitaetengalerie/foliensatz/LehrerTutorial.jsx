import React from 'react';
import { ChevronLeft, ChevronRight, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FolieAnzeige from './FolieAnzeige';

/** Schritt 3 (Prototyp): Zettelkino für Lehrkräfte – kurze Erklärung plus Tafel- und Tablet-„Screenshot“ je Schritt. */
export default function LehrerTutorial({ folien }) {
  const fertig = folien.filter((f) => f.status === 'fertig');
  const [i, setI] = React.useState(0);
  if (!fertig.length) return <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Baue zuerst den Funktionsaufbau, daraus entsteht das Tutorial.</p>;
  const f = fertig[Math.min(i, fertig.length - 1)];
  const bild = (titel, Icon, el) => (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5" />{titel}</p>
      <div className="pointer-events-none">{(f.vorlage ? (el === 'lehrer' || f.kanal === 'digital') : f[el]?.length) ? <FolieAnzeige folie={f} ansicht={el} /> : <p className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">Hier nichts zu sehen</p>}</div>
    </div>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-accent">Schritt {i + 1} von {fertig.length}{f.phase ? ` · ${f.phase}` : ''}</p>
        <p className="font-display text-lg font-bold">{f.titel}</p>
        <p className="whitespace-pre-wrap text-sm">{f.beschreibung || f.erklaerung}</p>
        {f.abfrage && <p className="mt-2 text-sm"><b>Das entscheidest du vorher:</b> {f.abfrage}</p>}
      </div>
      <div className="flex gap-4">
        {bild('Das sieht die Klasse (Tafel)', Monitor, 'lehrer')}
        {bild('Das sehen die Schüler (Tablet)', Tablet, 'schueler')}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft /> Zurück</Button>
        <Button disabled={i >= fertig.length - 1} onClick={() => setI(i + 1)}>Weiter <ChevronRight /></Button>
      </div>
    </div>
  );
}