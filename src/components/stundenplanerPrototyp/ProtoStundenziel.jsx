import React from 'react';
import { Target, ChevronDown, Plus, ArrowUp, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KorrekturFeld from './KorrekturFeld';
import { ZIELE } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 3: Hauptziel bestätigen, Alternativen zum Hauptziel oder Teilziel machen. */
export default function ProtoStundenziel({ ziel, setZiel, onWeiter }) {
  const [alt, setAlt] = React.useState(ZIELE.alternativen);
  const [offen, setOffen] = React.useState(false);
  const [laedt, setLaedt] = React.useState(false);
  const zumHaupt = (a) => { setAlt([ziel.haupt, ...alt.filter((x) => x !== a)]); setZiel({ ...ziel, haupt: a, teil: ziel.teil.filter((x) => x !== a) }); };
  const alsTeil = (a) => setZiel({ ...ziel, teil: [...ziel.teil, a] });
  const neu = () => { setLaedt(true); setTimeout(() => { setAlt([ziel.haupt, ...alt]); setZiel({ ...ziel, haupt: ZIELE.neu }); setLaedt(false); }, 1000); };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Target className="h-4 w-4" /> Mein Vorschlag fürs Stundenziel</p>
        <p className="mt-2 text-sm font-medium">{laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : ziel.haupt}</p>
        {ziel.teil.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground">Auch wichtig (Teilziele):</p>
            {ziel.teil.map((t) => (
              <p key={t} className="flex items-start gap-2 text-sm text-muted-foreground">+ {t}
                <button onClick={() => setZiel({ ...ziel, teil: ziel.teil.filter((x) => x !== t) })}><X className="h-3 w-3" /></button></p>
            ))}
          </div>
        )}
      </div>
      <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setOffen(!offen)}>
        <ChevronDown className={`h-3 w-3 transition-transform ${offen ? 'rotate-180' : ''}`} /> In welche Richtung könnte es noch gehen?
      </button>
      {offen && (
        <div className="space-y-2">
          {alt.filter((a) => !ziel.teil.includes(a)).map((a) => (
            <div key={a} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <span className="flex-1">{a}</span>
              <Button size="sm" variant="ghost" onClick={() => zumHaupt(a)}><ArrowUp /> Zum Hauptziel</Button>
              <Button size="sm" variant="ghost" onClick={() => alsTeil(a)}><Plus /> Auch wichtig</Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onWeiter}>Ja, so sehe ich das – weiter</Button>
        <KorrekturFeld knopf="Nein, das ist nicht das Stundenziel" platzhalter="Worauf soll es in der Stunde eigentlich hinauslaufen?" neuText="Stundenziel neu" onNeu={neu} />
      </div>
    </div>
  );
}