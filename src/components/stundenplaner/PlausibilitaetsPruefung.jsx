import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRUEFUNG } from '@/lib/stundenplanerVorschauDaten';

/** Schritt 3: Ehrliche Einschätzung – Entscheidungen nur, wenn etwas nicht passt. */
export default function PlausibilitaetsPruefung({ onWeiter }) {
  const [fall, setFall] = React.useState('bedingt');
  const [wahl, setWahl] = React.useState({});
  const fertig = fall === 'passt' || PRUEFUNG.entscheidungen.every((_, i) => wahl[i]);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Beispiel zeigen:
        <Button size="sm" variant={fall === 'passt' ? 'default' : 'outline'} onClick={() => setFall('passt')}>Passt</Button>
        <Button size="sm" variant={fall === 'bedingt' ? 'default' : 'outline'} onClick={() => setFall('bedingt')}>Passt bedingt</Button>
      </div>
      {fall === 'passt' ? (
        <div className="flex gap-3 rounded-lg border border-chart-3/50 bg-chart-3/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-chart-3" />
          <div>
            <p className="text-sm font-semibold">Sieht gut aus</p>
            <p className="text-sm">Zeit, Vorwissen und Material passen zusammen. Das können wir so ausprobieren.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-sm font-semibold">Passt bedingt</p>
              <p className="text-sm">{PRUEFUNG.satz}</p>
            </div>
          </div>
          <p className="text-sm font-medium">Bitte triff {PRUEFUNG.entscheidungen.length} Entscheidungen:</p>
          {PRUEFUNG.entscheidungen.map((e, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
              <p className="text-sm font-medium">{i + 1}. {e.frage}</p>
              <div className="flex flex-wrap gap-2">
                {e.optionen.map((o) => (
                  <Button key={o} size="sm" variant={wahl[i] === o ? 'default' : 'outline'} onClick={() => setWahl({ ...wahl, [i]: o })}>{o}</Button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <Button disabled={!fertig} onClick={onWeiter}>Grobentwurf erstellen</Button>
    </div>
  );
}