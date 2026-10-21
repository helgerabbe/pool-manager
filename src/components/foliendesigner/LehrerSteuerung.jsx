import React from 'react';
import { Play, Pause, RotateCcw, Unlock, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREIGABE } from '@/lib/folienOrganisation';

const KLASSE = 24;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Steuerleiste der Lehrkraft (Vorschau): Phase freigeben, Timer, Fertig-Stand der Klasse. Folgt den Einstellungen der Organisation. */
export default function LehrerSteuerung({ o }) {
  const [frei, setFrei] = React.useState(false);
  const [rest, setRest] = React.useState(300);
  const [laeuft, setLaeuft] = React.useState(false);
  const [fertig, setFertig] = React.useState(0);
  React.useEffect(() => {
    if (!laeuft) return undefined;
    const t = setInterval(() => setRest((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [laeuft]);
  const freigabeText = Object.fromEntries(FREIGABE)[o.freigabe];

  return (
    <div className="flex w-full max-w-5xl flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lehrer-Steuerung</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant={frei ? 'default' : 'outline'} onClick={() => setFrei(!frei)}>{frei ? <Unlock /> : <Lock />}{frei ? 'Phase freigegeben' : 'Phase freigeben'}</Button>
        {o.freigabe !== 'lehrkraft' && <span className="text-xs text-muted-foreground">sonst: {freigabeText}</span>}
      </div>
      {o.timer_sync && (
        <div className="flex items-center gap-1">
          <span className={`font-mono text-lg font-bold ${rest === 0 ? 'text-destructive' : ''}`}>{mmss(rest)}</span>
          <Button size="icon" variant="ghost" onClick={() => setLaeuft(!laeuft)}>{laeuft ? <Pause /> : <Play />}</Button>
          <Button size="icon" variant="ghost" onClick={() => { setLaeuft(false); setRest(300); }}><RotateCcw /></Button>
        </div>
      )}
      {o.fertig_melden && (
        <button className="flex flex-1 items-center gap-2 text-sm" title="Klicken simuliert eine Fertig-Meldung" onClick={() => setFertig((f) => (f >= KLASSE ? 0 : f + 1))}>
          <CheckCircle2 className="h-4 w-4 text-chart-3" />{fertig} von {KLASSE} fertig
          <span className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-chart-3" style={{ width: `${(fertig / KLASSE) * 100}%` }} /></span>
        </button>
      )}
      {!o.timer_sync && !o.fertig_melden && <span className="text-xs text-muted-foreground">Timer und Fertig-Meldung lassen sich in der Organisation einschalten.</span>}
    </div>
  );
}