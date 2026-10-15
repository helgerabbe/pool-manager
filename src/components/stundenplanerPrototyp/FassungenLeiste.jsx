import React from 'react';
import { Lightbulb, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FASSUNGEN } from '@/lib/stundenplanerPrototypDaten';

const Aufwand = ({ n }) => <span className="text-accent">{'●'.repeat(n)}<span className="text-muted-foreground/40">{'●'.repeat(3 - n)}</span></span>;

/** Umschalten zwischen erzeugten Fassungen und Erzeugen neuer Varianten. */
export default function FassungenLeiste({ vorhanden, aktiv, setAktiv, laedt, onErzeugen }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {vorhanden.map((k) => (
          <button key={k} onClick={() => setAktiv(k)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${aktiv === k ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40'}`}>
            <span className="block font-semibold">{FASSUNGEN[k].name}</span>
            <span className="opacity-80">Aufwand <Aufwand n={FASSUNGEN[k].aufwand} /></span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {!vorhanden.includes('kniff') && (
          <Button size="sm" variant="outline" disabled={!!laedt} onClick={() => onErzeugen('kniff')}>
            {laedt === 'kniff' ? <Loader2 className="animate-spin" /> : <Lightbulb />} Eine kleine neue Idee ausprobieren
          </Button>
        )}
        {!vorhanden.includes('aufwendig') && (
          <Button size="sm" variant="outline" disabled={!!laedt} onClick={() => onErzeugen('aufwendig')}>
            {laedt === 'aufwendig' ? <Loader2 className="animate-spin" /> : <Wand2 />} Abwechslungsreichere Alternative entwickeln
          </Button>
        )}
      </div>
    </div>
  );
}