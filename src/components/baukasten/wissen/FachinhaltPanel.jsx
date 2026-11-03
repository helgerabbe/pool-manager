import React from 'react';
import { Badge } from '@/components/ui/badge';
import WertAnzeige from './WertAnzeige';
import Abschnitt from './Abschnitt';

/** Fachlich-inhaltliche Struktur der Einheit aus der Struktur-Planung. */
export default function FachinhaltPanel({ planung }) {
  if (!planung) return <p className="text-sm text-muted-foreground">Für diese Einheit ist noch keine Struktur geplant. Fachlicher Inhalt ist nicht hinterlegt.</p>;
  return (
    <div className="space-y-3 text-sm">
      <Abschnitt titel="Thema" offen><p>{planung.thema || '–'}</p></Abschnitt>
      {planung.vorgaben && <Abschnitt titel="Vorgaben der Lehrkraft"><p className="whitespace-pre-line">{planung.vorgaben}</p></Abschnitt>}
      <Abschnitt titel="Recherche-Grundlage"><WertAnzeige wert={planung.fundament} /></Abschnitt>
      <Abschnitt titel={`Inhalte (${planung.inhalte?.length || 0})`} offen>
        <ul className="space-y-2">
          {(planung.inhalte || []).map((x) => (
            <li key={x.id || x.titel} className="rounded-md border p-2">
              <p className="font-semibold">{x.titel} {x.kc && <Badge variant="secondary" className="ml-1">KC</Badge>} {x.prioritaet === 'raus' && <Badge variant="outline">gestrichen</Badge>}</p>
              {x.beschreibung && <p className="text-muted-foreground">{x.beschreibung}</p>}
            </li>
          ))}
        </ul>
      </Abschnitt>
      <Abschnitt titel={`Verlauf (${planung.verlauf?.length || 0} Abschnitte)`}>
        <ol className="space-y-2">
          {(planung.verlauf || []).map((v, i) => (
            <li key={i} className="rounded-md border p-2"><p className="font-semibold">{v.nr || i + 1}. {v.titel}</p>{v.lernziel && <p className="text-muted-foreground">{v.lernziel}</p>}</li>
          ))}
        </ol>
      </Abschnitt>
    </div>
  );
}