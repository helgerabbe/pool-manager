import React from 'react';
import { Loader2 } from 'lucide-react';

/** Fortschritt beim Bauen des Foliensatzes: Schritt, fertige Folien und laufende Zeit. */
export default function BauFortschrittLeiste({ planen, folien }) {
  const [sek, setSek] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setSek((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fertig = folien.filter((f) => f.status === 'fertig' || f.status === 'fehler').length;
  const anteil = planen ? 10 : 10 + (90 * fertig) / Math.max(folien.length, 1);
  const zeit = `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  return (
    <div className="space-y-1 rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{planen ? 'Schritt 1: Die KI plant die Folienfolge …' : `Schritt 2: Folien werden gebaut · ${fertig} von ${folien.length} fertig`}</span>
        <span className="ml-auto text-xs text-muted-foreground">läuft seit {zeit} · die KI arbeitet noch</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-muted">
        <div className={`h-2 rounded bg-primary transition-all ${planen ? 'animate-pulse' : ''}`} style={{ width: `${anteil}%` }} />
      </div>
    </div>
  );
}