import React from 'react';
import { Sparkles, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnkerFelder from './AnkerFelder';
import DauerWahl from './DauerWahl';
import { ankerVorhanden } from '@/lib/kiGrobplanung';

const SCHULFORMEN = ['Integrierte Gesamtschule', 'Kooperative Gesamtschule', 'Gymnasium', 'Realschule', 'Oberschule', 'Hauptschule', 'Förderschule'];

/** Einstieg: Fundament der Planung – Kontext automatisch, inhaltlicher Anker ist die einzige Pflicht. */
export default function FundamentStart({ einheit, verlauf, anker, setAnker, dauer, onPruefen, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const [rueck, setRueck] = React.useState(null);
  const [fehler, setFehler] = React.useState(false);
  const pruefen = async () => {
    setLaedt(true); setFehler(false); setRueck(null);
    const r = await onPruefen().catch(() => null);
    setLaedt(false);
    if (!r) return setFehler(true);
    if (r.ausreichend) onWeiter(); else setRueck(r);
  };
  const richtung = (o) => { setAnker((a) => ({ ...a, richtung: o })); onWeiter(); };
  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-semibold">Du möchtest eine neue Stunde planen.</p>
          <p className="text-muted-foreground">Damit wir gut planen können, brauchen wir ein Fundament. Fach, Jahrgang und Einheit kennen wir schon: <span className="font-medium text-foreground">{einheit.fach} · Jg. {einheit.jahrgangsstufe} · {einheit.titel}</span> (Niedersachsen). Jetzt fehlen noch die Schulform und worum es in der Stunde gehen soll.</p>
          <label className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">Schulform:</span>
            <select value={anker.schulform} onChange={(e) => setAnker((a) => ({ ...a, schulform: e.target.value }))} className="rounded-md border bg-card px-2 py-1">
              {SCHULFORMEN.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>
      <DauerWahl {...dauer} />
      <div className="rounded-xl border-l-4 border-l-accent bg-accent/5 p-3 text-sm">
        <p className="font-semibold">Pflicht: Worum geht es in der Stunde?</p>
        <p className="text-muted-foreground">Dafür gibt es drei Möglichkeiten. <span className="font-medium text-foreground">Mindestens eine</span> musst du nutzen. Du kannst aber auch alle kombinieren: ein Thema wählen, etwas dazu beschreiben und Material hochladen.</p>
      </div>
      <AnkerFelder verlauf={verlauf} anker={anker} setAnker={setAnker} />
      {fehler && <p className="text-xs text-destructive">Die Prüfung hat nicht geklappt. Bitte noch einmal versuchen.</p>}
      {rueck && (
        <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><HelpCircle className="h-4 w-4 text-accent" /> {rueck.rueckfrage || 'Das ist mir noch etwas zu ungenau. In welche Richtung soll es gehen?'}</p>
          {(rueck.optionen || []).map((o) => <button key={o} onClick={() => richtung(o)} className="block w-full rounded-lg border bg-card p-3 text-left text-sm hover:border-primary/40">{o}</button>)}
          <button onClick={onWeiter} className="text-xs text-muted-foreground underline">Trotzdem so weitermachen</button>
        </div>
      )}
      <Button disabled={!ankerVorhanden(anker) || laedt} onClick={pruefen}>
        {laedt ? <Loader2 className="animate-spin" /> : null} {laedt ? 'Ich prüfe deine Angaben …' : 'Prüfen und weiter'}
      </Button>
    </div>
  );
}