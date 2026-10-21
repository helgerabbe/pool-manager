import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ElementPalette from '@/components/foliendesigner/ElementPalette';
import FolienArbeitsflaeche from '@/components/foliendesigner/FolienArbeitsflaeche';
import { FOLIEN_ELEMENT } from '@/lib/folienElemente';

/** Folien-Designer: Übersicht der Bausteine, auf die der Grafikassistent zurückgreifen kann (noch ohne Funktion). */
export default function FolienDesigner() {
  const [elemente, setElemente] = React.useState([]);
  const [gewaehlt, setGewaehlt] = React.useState(null);
  const aktiv = FOLIEN_ELEMENT[elemente.find((e) => e.id === gewaehlt)?.typ];

  return (
    <div className="flex h-full">
      <ElementPalette />
      <div className="flex flex-1 flex-col items-center gap-4 overflow-auto bg-muted/40 p-6">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Folien-Designer</h1>
            <p className="text-sm text-muted-foreground">
              {aktiv ? `${aktiv.label}${aktiv.modus ? ' · später wählbar: Einzelmodus oder Gruppenmodus' : ''}` : 'Vorschau der Bausteine des Grafikassistenten, noch ohne hinterlegte Funktion.'}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={!elemente.length} onClick={() => { setElemente([]); setGewaehlt(null); }}><Trash2 />Folie leeren</Button>
        </div>
        <FolienArbeitsflaeche elemente={elemente} setElemente={setElemente} gewaehlt={gewaehlt} setGewaehlt={setGewaehlt} />
      </div>
    </div>
  );
}