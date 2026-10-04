import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from './FreitextMitSprache';
import VorherigeAbschnitte from './VorherigeAbschnitte';

const ZEITEN = ['Einzelstunde (40 Min.)', 'Doppelstunde (85 Min.)', 'Andere Zeit'];

/** Schritt 2: Rahmenbedingungen – in der Vorschau ohne Speichern. */
export default function RahmenKlaeren({ abschnitt, vorherige, onWeiter }) {
  const [zeit, setZeit] = React.useState(ZEITEN[0]);
  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-primary/5 p-3 text-sm">
        Bevor wir tiefer planen, lass uns kurz den Rahmen für <b>„{abschnitt.titel}"</b> klären.
      </p>
      <Frage titel="Wie viel Zeit hast du wirklich?">
        <div className="flex flex-wrap gap-2">
          {ZEITEN.map((z) => (
            <Button key={z} size="sm" variant={z === zeit ? 'default' : 'outline'} onClick={() => setZeit(z)}>{z}</Button>
          ))}
        </div>
      </Frage>
      <Frage titel="Was hast du vorher schon mit der Lerngruppe bearbeitet, und wie ist der Wissensstand der Schüler?">
        {vorherige.length > 0 && <VorherigeAbschnitte abschnitte={vorherige} />}
        <FreitextMitSprache placeholder="z. B. Rechtwinklige Dreiecke kennen alle, Flächen von Quadraten sitzen bei einigen noch nicht sicher …" />
      </Frage>
      <Frage titel="Hast du Material, das dir für diese Stunde wichtig ist und das du unbedingt benutzen möchtest?">
        <Button size="sm" variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Arbeitsblatt_Pythagoras.pdf</Button>
      </Frage>
      <Frage titel="Gibt es sonst etwas, das ich wissen sollte?">
        <FreitextMitSprache placeholder="z. B. zur Lerngruppe („eher unruhig, arbeitet gern in Paaren“) oder ein besonderer Wunsch für diese Stunde („unbedingt induktiver Einstieg“)" />
      </Frage>
      <Button onClick={onWeiter}>Rahmen prüfen lassen</Button>
    </div>
  );
}

function Frage({ titel, children }) {
  return <div className="space-y-2"><p className="text-sm font-medium">{titel}</p>{children}</div>;
}