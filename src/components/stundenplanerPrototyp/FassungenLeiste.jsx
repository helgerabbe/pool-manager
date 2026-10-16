import React from 'react';
import { Lightbulb, Wand2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KorrekturFeld from './KorrekturFeld';
import MethodeWaehlen from './MethodeWaehlen';

const Aufwand = ({ n }) => <span className="text-accent">{'●'.repeat(n)}<span className="opacity-30">{'●'.repeat(3 - n)}</span></span>;

/** Alle Entwürfe nebeneinander; neue Varianten kommen dazu, alte bleiben erhalten. */
export default function FassungenLeiste({ entwuerfe, aktiv, setAktiv, laedt, onErzeugen, onNochEine, onMethode, modellKey, varianteKey }) {
  const hat = (k) => entwuerfe.some((e) => e.vorlage === k);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {entwuerfe.map((e, i) => (
          <button key={i} onClick={() => setAktiv(i)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${aktiv === i ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40'}`}>
            <span className="block font-semibold">{e.name}</span>
            <span className="opacity-80">Aufwand <Aufwand n={e.aufwand} /></span>
          </button>
        ))}
        {laedt && <span className="flex items-center gap-2 px-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Neuer Vorschlag entsteht …</span>}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {!hat('kniff') && <Button size="sm" variant="outline" disabled={laedt} onClick={() => onErzeugen('kniff')}><Lightbulb /> Eine kleine neue Idee ausprobieren</Button>}
        {!hat('aufwendig') && <Button size="sm" variant="outline" disabled={laedt} onClick={() => onErzeugen('aufwendig')}><Wand2 /> Abwechslungsreichere Alternative entwickeln</Button>}
        <MethodeWaehlen onWahl={onMethode} />
        {entwuerfe.length > 1 && (
          <KorrekturFeld knopf={<><Plus className="h-4 w-4" /> Noch eine Idee</>} neuText="Neuen Vorschlag erstellen"
            platzhalter="Optionaler Impuls, z. B. „mehr Handlungs- und Produktionsorientierung“ oder „etwas Szenisches“" onNeu={onNochEine} />
        )}
      </div>
    </div>
  );
}