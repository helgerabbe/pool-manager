import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Hinweise mit Aufgabenbezug: nur die Zahl je Lernpaket, bearbeitet wird an der Aufgabe. */
export default function MbkAufgabenZahlen({ befunde, einheitId }) {
  const gruppen = new Map();
  for (const b of befunde) {
    const titel = b.lernpaket_titel || b.themenfeld_titel || 'Weitere Aufgaben';
    const g = gruppen.get(titel) || { titel, lernpaketId: b.lernpaket_id, anzahl: 0 };
    g.anzahl += 1;
    gruppen.set(titel, g);
  }
  return (
    <div className="rounded-lg border divide-y bg-card">
      {[...gruppen.values()].map((g) => (
        <div key={g.titel} className="flex items-center gap-3 px-3 py-2">
          <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center shrink-0">{g.anzahl}</span>
          <span className="text-sm flex-1 min-w-0">{g.titel}</span>
          {g.lernpaketId ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/workspace?einheit=${einheitId}&tab=lernpakete&lernpaket=${g.lernpaketId}`}>
                Zum Lernpaket <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Einstieg oder Gesamtaufgabe im Reiter „Lernpakete"</span>
          )}
        </div>
      ))}
    </div>
  );
}