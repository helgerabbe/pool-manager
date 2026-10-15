import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModellKarte from './ModellKarte';
import { STUNDENTYP } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 3: Welche Art von Stunde ist das? Vorschlag aus dem didaktischen Grundmodell. */
export default function ProtoStundentyp({ modell, setModell, onWeiter }) {
  const vorschlag = modell === STUNDENTYP.vorschlag;
  const andere = [{ key: STUNDENTYP.vorschlag, wann: 'Mein ursprünglicher Vorschlag.' }, ...STUNDENTYP.alternativen].filter((a) => a.key !== modell);
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Compass className="h-4 w-4" /> {vorschlag ? 'So würde ich die Stunde anlegen' : 'Deine Wahl'}</p>
      <ModellKarte modellKey={modell} hervorgehoben text={vorschlag ? STUNDENTYP.begruendung : 'Der Entwurf folgt diesem Aufbau.'} />
      <p className="text-sm text-muted-foreground">Ist das in deinem Sinne – oder soll der Schwerpunkt woanders liegen?</p>
      <div className="space-y-2">
        {andere.map((a) => (
          <ModellKarte key={a.key} modellKey={a.key} text={a.wann}>
            <Button size="sm" variant="outline" onClick={() => setModell(a.key)}>Stattdessen</Button>
          </ModellKarte>
        ))}
      </div>
      <Button onClick={onWeiter}>Passt so – weiter zum Stundenziel</Button>
    </div>
  );
}