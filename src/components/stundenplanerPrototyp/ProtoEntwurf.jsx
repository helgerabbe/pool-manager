import React from 'react';
import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhasenKarte from './PhasenKarte';
import FassungenLeiste from './FassungenLeiste';
import { FASSUNGEN } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 3: Grobentwurf mit parallelen Fassungen (Standard bleibt immer erhalten). */
export default function ProtoEntwurf({ entwuerfe, setEntwuerfe, aktiv, setAktiv, routine, setRoutine, onWeiter }) {
  const [laedt, setLaedt] = React.useState(null);
  const erzeugen = (k) => {
    setLaedt(k);
    setTimeout(() => {
      setEntwuerfe((e) => ({ ...e, [k]: FASSUNGEN[k].phasen.map((x) => ({ ...x })) }));
      setAktiv(k); setLaedt(null);
    }, 1200);
  };
  const phasen = entwuerfe[aktiv];
  const aendern = (i, text) => setEntwuerfe((e) => ({ ...e, [aktiv]: e[aktiv].map((x, j) => (j === i ? { ...x, aktivitaet: text } : x)) }));
  return (
    <div className="space-y-5">
      <FassungenLeiste vorhanden={Object.keys(entwuerfe)} aktiv={aktiv} setAktiv={setAktiv} laedt={laedt} onErzeugen={erzeugen} />
      <div>
        <p className="text-sm font-semibold">{FASSUNGEN[aktiv].kurz}</p>
        {FASSUNGEN[aktiv].hinweis && <p className="text-xs text-accent">{FASSUNGEN[aktiv].hinweis}</p>}
      </div>
      <div className="space-y-2">
        {routine.trim() && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"><Repeat className="h-4 w-4" /> Feste Routine: {routine}</div>
        )}
        {phasen.map((ph, i) => <PhasenKarte key={`${aktiv}-${i}`} phase={ph} onAendern={(t) => aendern(i, t)} />)}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Gibt es eine feste Routine in deinem Unterricht? (optional)</p>
        <Input value={routine} onChange={(e) => setRoutine(e.target.value)} placeholder="z. B. Begrüßung und Wochenplan-Check, 3 Min." />
      </div>
      <Button onClick={onWeiter}>Mit dieser Fassung weiter</Button>
    </div>
  );
}