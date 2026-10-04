import React from 'react';
import { Globe, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FesteMaterialien from './FesteMaterialien';
import FeinPhase from './FeinPhase';

/** Schritt 5: Methode je Phase mit Begründung, Hinweisen und Neuplanung. */
export default function Feinplanung({ plan, laedt, neuPlanIndex, setPlan, onNeuPlanen, onInternet, onAnlegen, legtAn }) {
  if (!plan) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich plane die Phasen genau …</p>;
  }
  const aendern = (i, teil) => setPlan({ ...plan, phasen: plan.phasen.map((p, j) => (j === i ? { ...p, ...teil } : p)) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Für jede Phase wählen wir eine Methode aus unserem Katalog, sagen, was die Schüler tun, und begründen es.</p>
      <ol className="space-y-2">
        {plan.phasen.map((p, i) => (
          <FeinPhase key={i} p={p} laedt={neuPlanIndex === i} onAendern={(t) => aendern(i, t)} onNeuPlanen={(w) => onNeuPlanen(i, w)} />
        ))}
      </ol>
      <FesteMaterialien materialien={plan.materialien} />
      <Button size="sm" variant="outline" className="gap-2" disabled={laedt} onClick={onInternet}>
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        Im Internet nach passenden Materialien und Aufgabenideen suchen und zur Liste hinzufügen
      </Button>
      <Button className="gap-2" disabled={legtAn || laedt} onClick={onAnlegen}>
        {legtAn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Stunde anlegen und im Editor öffnen
      </Button>
    </div>
  );
}