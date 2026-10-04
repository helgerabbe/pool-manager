import React from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';

const SCHRITTE = [
  'Problemorientierter Einstieg, der eine Frage aufwirft',
  'Eigenes Entdecken an Beispielen',
  'Gemeinsames Verallgemeinern zur Regel',
  'Anwenden der Regel – zurück zur Ausgangsfrage',
];

/** Aufklappbare Begründung: Welches didaktische Modell steckt hinter dem Ablauf? */
export default function DidaktischesModell() {
  const [offen, setOffen] = React.useState(false);
  return (
    <div className="rounded-lg border bg-primary/5 p-3">
      <button type="button" onClick={() => setOffen(!offen)} className="flex w-full items-center gap-2 text-left text-sm font-medium text-primary">
        <Lightbulb className="h-4 w-4" /> Warum sieht der Ablauf so aus?
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && (
        <div className="mt-3 space-y-2 text-sm">
          <p>Das ist eine <strong>Erarbeitungsstunde mit induktivem Aufbau</strong>: Wir gehen vom Besonderen zum Allgemeinen. Die Schüler entdecken die Regel erst an Beispielen und formulieren sie dann selbst.</p>
          <p>Eine solche Stunde baut sich standardmäßig aus diesen Schritten auf:</p>
          <ol className="list-decimal space-y-1 pl-5">{SCHRITTE.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="text-muted-foreground">Deshalb folgt der Ablauf unten genau diesen vier Phasen.</p>
        </div>
      )}
    </div>
  );
}