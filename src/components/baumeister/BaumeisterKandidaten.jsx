import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

export default function BaumeisterKandidaten({ ergebnis, onWaehlen, onZurueck }) {
  const { kandidaten = [], eindeutig, rueckfrage } = ergebnis || {};
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {kandidaten.length === 0
          ? rueckfrage
          : eindeutig
            ? 'Ich glaube, es geht um diese Stelle. Stimmt das?'
            : rueckfrage || 'Ich bin mir nicht ganz sicher. Welche Stelle meinst du?'}
      </p>
      {kandidaten.map((k) => (
        <div key={k.ref} className="rounded-lg border border-border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" /> {k.ort}
          </div>
          <div className="font-semibold text-sm">{k.titel}</div>
          {k.zitat && <blockquote className="text-xs italic border-l-2 border-accent pl-2">„{k.zitat}"</blockquote>}
          {k.begruendung && <p className="text-xs text-muted-foreground">{k.begruendung}</p>}
          <Button size="sm" onClick={() => onWaehlen(k)}>Ja, diese Stelle</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onZurueck}>Hinweis anders formulieren</Button>
    </div>
  );
}