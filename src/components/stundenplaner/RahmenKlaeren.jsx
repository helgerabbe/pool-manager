import React from 'react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from './FreitextMitSprache';
import VorherigeAbschnitte from './VorherigeAbschnitte';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';

const ZEITEN = ['Einzelstunde (40 Min.)', 'Doppelstunde (85 Min.)', 'Andere Zeit'];

/** Schritt 2: Rahmenbedingungen der Stunde erfassen. */
export default function RahmenKlaeren({ abschnitt, vorherige, rahmen, setRahmen, onWeiter }) {
  const feld = (k) => (v) => setRahmen({ ...rahmen, [k]: v });
  const status = rahmen.vorherigeStatus || vorherige.map(() => 'ja');
  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-primary/5 p-3 text-sm">
        Bevor wir tiefer planen, lass uns kurz den Rahmen für <b>„{abschnitt.titel}"</b> klären.
      </p>
      <Frage titel="Wie viel Zeit hast du wirklich?">
        <div className="flex flex-wrap gap-2">
          {ZEITEN.map((z) => (
            <Button key={z} size="sm" variant={z === rahmen.zeit ? 'default' : 'outline'} onClick={() => feld('zeit')(z)}>{z}</Button>
          ))}
        </div>
      </Frage>
      {vorherige.length > 0 && (
        <Frage titel="Wie sind die bisherigen Stunden aus deinem Verlauf gelaufen?">
          <VorherigeAbschnitte abschnitte={vorherige} status={status} setStatus={feld('vorherigeStatus')} />
        </Frage>
      )}
      <Frage titel={vorherige.length > 0
        ? 'Gibt es darüber hinaus etwas, das du mit der Lerngruppe zu diesem Thema schon gemacht hast? Wie ist der Wissensstand?'
        : 'Das ist die erste Stunde der Einheit. Was hast du vorher schon mit der Lerngruppe bearbeitet, und wie ist der Wissensstand der Schüler?'}>
        <FreitextMitSprache value={rahmen.vorwissen || ''} onChange={feld('vorwissen')} placeholder="z. B. Rechtwinklige Dreiecke kennen alle, Flächen von Quadraten sitzen bei einigen noch nicht sicher …" />
      </Frage>
      <Frage titel="Hast du Material, das dir für diese Stunde wichtig ist und das du unbedingt benutzen möchtest?">
        <MaterialUpload materialien={rahmen.materialien || []} onChange={feld('materialien')} />
      </Frage>
      <Frage titel="Gibt es sonst etwas, das ich wissen sollte?">
        <FreitextMitSprache value={rahmen.sonstiges || ''} onChange={feld('sonstiges')} placeholder="z. B. zur Lerngruppe („eher unruhig, arbeitet gern in Paaren“) oder ein besonderer Wunsch für diese Stunde („unbedingt induktiver Einstieg“)" />
      </Frage>
      <Button onClick={() => { if (!rahmen.vorherigeStatus) feld('vorherigeStatus')(status); onWeiter(); }}>Rahmen prüfen lassen</Button>
    </div>
  );
}

function Frage({ titel, children }) {
  return <div className="space-y-2"><p className="text-sm font-medium">{titel}</p>{children}</div>;
}