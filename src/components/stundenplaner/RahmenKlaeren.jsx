import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ZEITEN = ['Einzelstunde (40 Min.)', 'Doppelstunde (85 Min.)', 'Andere Zeit'];

/** Schritt 2: Rahmenbedingungen – in der Vorschau ohne Speichern. */
export default function RahmenKlaeren({ abschnitt, onWeiter }) {
  const [zeit, setZeit] = React.useState(ZEITEN[0]);
  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-primary/5 p-3 text-sm">
        Bevor ich plane, kläre ich kurz den Rahmen für <b>„{abschnitt.titel}"</b>.
      </p>
      <Frage titel="Wie viel Zeit hast du wirklich?">
        <div className="flex flex-wrap gap-2">
          {ZEITEN.map((z) => (
            <Button key={z} size="sm" variant={z === zeit ? 'default' : 'outline'} onClick={() => setZeit(z)}>{z}</Button>
          ))}
        </div>
      </Frage>
      <Frage titel="Was ist vorher schon gelaufen?">
        <Textarea rows={2} defaultValue="Rechtwinklige Dreiecke und Flächen von Quadraten haben wir behandelt." />
      </Frage>
      <Frage titel="Hast du Material, das dir wichtig ist?">
        <Button size="sm" variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Arbeitsblatt_Pythagoras.pdf</Button>
      </Frage>
      <Frage titel="Gibt es sonst etwas, das ich wissen sollte?">
        <Textarea rows={2} defaultValue="Ich möchte unbedingt einen induktiven Einstieg. Die Klasse ist eher unruhig." />
      </Frage>
      <Button onClick={onWeiter}>Rahmen prüfen lassen</Button>
    </div>
  );
}

function Frage({ titel, children }) {
  return <div className="space-y-2"><p className="text-sm font-medium">{titel}</p>{children}</div>;
}