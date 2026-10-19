import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UmsetzungsPhase from './UmsetzungsPhase';

/** Feinplanung, Teil 1: je Phase analog, digital oder gemischt. */
export default function UmsetzungsWahlSchritt({ entwurf, setEntwurf, onVorschlag, onZurueck, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const setzePhase = (i, daten) => setEntwurf((e) => ({ ...e, phasen: e.phasen.map((p, j) => (j === i ? { ...p, ...daten } : p)) }));
  const vorschlagen = () => {
    setLaedt(true); setFehler('');
    onVorschlag()
      .then((vs) => setEntwurf((e) => ({ ...e, phasen: e.phasen.map((p, i) => (vs[i] ? { ...p, umsetzung: vs[i].umsetzung, umsetzung_begruendung: vs[i].begruendung } : p)) })))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(false));
  };
  const alleGewaehlt = entwurf.phasen.every((p) => p.umsetzung);
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Jetzt entscheiden wir für jede Phase, ob sie analog, digital oder gemischt läuft. Digital lohnt sich vor allem, wenn es echten Mehrwert bringt, etwa sofortige Rückmeldung oder Ergebnisse sammeln.</p>
      </div>
      <Button variant="outline" disabled={laedt} onClick={vorschlagen}>{laedt ? <Loader2 className="animate-spin" /> : <Sparkles />} Vorschlag machen lassen</Button>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      <div className="space-y-2">
        {entwurf.phasen.map((p, i) => <UmsetzungsPhase key={i} phase={p} nr={i + 1} onWahl={(u) => setzePhase(i, { umsetzung: u })} />)}
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onZurueck}>Zurück</Button>
        <Button disabled={!alleGewaehlt} onClick={onWeiter}>Weiter</Button>
      </div>
    </div>
  );
}