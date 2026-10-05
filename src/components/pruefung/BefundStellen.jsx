import React, { useState } from 'react';
import { Loader2, Crosshair, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

/** Link direkt an die Stelle (öffnet in einem neuen Fenster). */
function stelleHref(s, einheitId) {
  const basis = `/workspace?einheit=${einheitId}`;
  if (s.art === 'aktivitaet') return `${basis}&tab=lernpakete&activity=${s.ziel_id}`;
  return `${basis}&tab=${s.projekt ? 'ebene3' : 'ebene2'}&aufgabe=${s.ziel_id}`;
}

/** Sucht auf Klick alle konkreten Stellen eines Befunds und verlinkt sie einzeln. */
export default function BefundStellen({ befundId, einheitId }) {
  const [stellen, setStellen] = useState(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState('');

  const suchen = async () => {
    setLaedt(true);
    setFehler('');
    try {
      const res = await base44.functions.invoke('befundStellenFinden', { befund_id: befundId });
      setStellen(res.data?.stellen || []);
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Suche ist fehlgeschlagen.');
    } finally {
      setLaedt(false);
    }
  };

  if (!stellen) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="outline" className="gap-1.5" disabled={laedt} onClick={suchen}>
          {laedt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          {laedt ? 'Suche die genauen Stellen …' : 'Genaue Stellen finden'}
        </Button>
        {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      </div>
    );
  }

  if (stellen.length === 0) return <p className="text-xs text-muted-foreground">Keine passende Stelle gefunden.</p>;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">Betroffene Stellen</p>
      {stellen.map((s) => (
        <a key={s.ref} href={stelleHref(s, einheitId)} target="_blank" rel="noopener noreferrer"
          className="block rounded-md border bg-muted/30 p-2 hover:bg-muted transition-colors">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-0.5">
              {s.rolle && <p className="text-xs font-semibold text-primary">{s.rolle}</p>}
              <p className="text-xs">{s.ort}</p>
              {s.zitat && <p className="text-xs italic text-muted-foreground">„{s.zitat}"</p>}
            </div>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          </div>
        </a>
      ))}
    </div>
  );
}