import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Loader2 } from 'lucide-react';
import WertAnzeige from './WertAnzeige';
import Abschnitt from './Abschnitt';

/** Was die App selbst im Internet zur Einheit herausgefunden hat. */
export default function PlanungsGrundlage({ planung, laedt, onRecherche }) {
  const da = planung?.fundament && Object.keys(planung.fundament).length > 0;
  return (
    <Abschnitt titel="Internetrecherche der App" offen={!da}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">Was die App selbst zu dieser Einheit im Internet gefunden hat (z. B. Kerncurriculum, Fachdidaktik, Hintergrundwissen). Eine erste Recherche entsteht beim Planen der Einheitsstruktur.</p>
        {da ? <WertAnzeige wert={planung.fundament} /> : <p className="text-muted-foreground">Noch keine Internetrecherche vorhanden.</p>}
        <Button variant="secondary" size="sm" onClick={onRecherche} disabled={laedt}>
          {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} {da ? 'Erneut im Internet recherchieren' : 'Jetzt im Internet recherchieren'}
        </Button>
      </div>
    </Abschnitt>
  );
}