import React from 'react';
import { Badge } from '@/components/ui/badge';
import WertAnzeige from './WertAnzeige';
import Abschnitt from './Abschnitt';

/** Was aus der Struktur-Planung der Einheit schon vorliegt. */
export default function PlanungsGrundlage({ planung }) {
  if (!planung) return <p className="text-sm text-muted-foreground">Aus der Struktur-Planung liegt nichts vor.</p>;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aus der Struktur-Planung</p>
      {planung.vorgaben && <Abschnitt titel="Eingegebene Informationen"><p className="whitespace-pre-line">{planung.vorgaben}</p></Abschnitt>}
      <Abschnitt titel="Recherche der Struktur-Planung"><WertAnzeige wert={planung.fundament} /></Abschnitt>
      <Abschnitt titel={`Mögliche Inhalte (${planung.inhalte?.length || 0})`}>
        <ul className="space-y-2">
          {(planung.inhalte || []).map((x) => (
            <li key={x.id || x.titel} className="rounded-md border p-2">
              <p className="font-semibold">{x.titel} {x.kc && <Badge variant="secondary" className="ml-1">KC</Badge>}</p>
              {x.beschreibung && <p className="text-muted-foreground">{x.beschreibung}</p>}
            </li>
          ))}
        </ul>
      </Abschnitt>
    </div>
  );
}