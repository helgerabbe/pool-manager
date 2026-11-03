import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import WertAnzeige from './WertAnzeige';
import Abschnitt from './Abschnitt';

/** Übersicht des Stundenfundaments plus Ideenkiste möglicher Inhalte. */
export default function FundamentAnsicht({ fundament, planung, onBearbeiten }) {
  const ideen = (planung?.inhalte || []).filter((x) => x.prioritaet !== 'raus');
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <WertAnzeige wert={{ ...fundament, materialien: (fundament.materialien || []).map((m) => m.name) }} />
        <Button onClick={onBearbeiten}><Pencil className="h-4 w-4" /> Fundament bearbeiten</Button>
      </div>
      <Abschnitt titel={`Ideenkiste: mögliche Inhalte der Einheit (${ideen.length})`}>
        {!ideen.length ? <p className="text-muted-foreground">Keine Vorschläge aus der Einheitsplanung.</p> : (
          <ul className="space-y-2">
            {ideen.map((x) => (
              <li key={x.id || x.titel} className="rounded-md border p-2">
                <p className="font-semibold">{x.titel} {x.kc && <Badge variant="secondary" className="ml-1">KC</Badge>}</p>
                {x.beschreibung && <p className="text-muted-foreground">{x.beschreibung}</p>}
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>
    </div>
  );
}