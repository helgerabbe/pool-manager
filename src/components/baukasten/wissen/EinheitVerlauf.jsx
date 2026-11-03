import React from 'react';
import Abschnitt from './Abschnitt';

/** Möglicher Verlauf der Einheit aus der Einheitsplanung. */
export default function EinheitVerlauf({ planung }) {
  const verlauf = planung?.verlauf || [];
  return (
    <Abschnitt titel={`Möglicher Verlauf der Einheit (${verlauf.length})`}>
      <div className="space-y-3">
        {!verlauf.length && !planung?.vorgaben && <p className="text-muted-foreground">Aus der Einheitsplanung liegt kein Verlauf vor.</p>}
        {verlauf.length > 0 && (
          <ol className="space-y-2">
            {verlauf.map((v, i) => (
              <li key={i} className="rounded-md border p-2"><p className="font-semibold">{v.nr || i + 1}. {v.titel}{v.zeit_text && <span className="ml-2 font-normal text-muted-foreground">{v.zeit_text}</span>}</p>{v.lernziel && <p className="text-muted-foreground">{v.lernziel}</p>}</li>
            ))}
          </ol>
        )}
        {planung?.vorgaben && (
          <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Deine Planungsnotizen</p><p className="whitespace-pre-line">{planung.vorgaben}</p></div>
        )}
      </div>
    </Abschnitt>
  );
}