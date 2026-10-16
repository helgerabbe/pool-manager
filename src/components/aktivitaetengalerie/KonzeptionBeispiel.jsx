import React from 'react';
import { KONZEPTION_BEISPIELE } from '@/lib/konzeptionBeispiele';

/** Fachbeispiele zu einem Stundenmodell: ein Klick auf das Fach zeigt die Beispielstunde kompakt. */
export default function KonzeptionBeispiel({ modellKey, phasen }) {
  const beispiele = KONZEPTION_BEISPIELE[modellKey];
  const [offen, setOffen] = React.useState(null);
  if (!beispiele) return null;
  const b = beispiele.find((x) => x.fach === offen);
  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground">Beispiel:</span>
        {beispiele.map((x) => (
          <button key={x.fach} onClick={() => setOffen(offen === x.fach ? null : x.fach)}
            className={`rounded-full border px-2 py-0.5 ${offen === x.fach ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{x.fach}</button>
        ))}
      </div>
      {b && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
          <p className="font-semibold">{b.fach}: {b.thema}</p>
          <p className="text-muted-foreground"><strong>Idee:</strong> {b.idee}</p>
          {b.phasen.map((p, i) => (
            <div key={i}>
              <p className="font-medium text-primary">{i + 1}. {phasen[i]}</p>
              <p><span className="text-muted-foreground">Lehrkraft:</span> {p.lehrer}</p>
              <p><span className="text-muted-foreground">Schüler:</span> {p.schueler}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}