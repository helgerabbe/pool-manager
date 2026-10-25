import React from 'react';
import { Plus, ListChecks, LayoutTemplate, Shapes } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UebungWahl from './wahl/UebungWahl';
import StandardfolieWahl from './wahl/StandardfolieWahl';
import MethodeWahl from './wahl/MethodeWahl';

const KNOEPFE = [
  { k: 'uebung', label: 'Übung hinzufügen', icon: ListChecks, farbe: 'border-chart-3/40 hover:bg-chart-3/10 text-chart-3' },
  { k: 'standard', label: 'Standardfolie hinzufügen', icon: LayoutTemplate, farbe: 'border-chart-4/40 hover:bg-chart-4/10 text-chart-4' },
  { k: 'methode', label: 'Methode hinzufügen', icon: Shapes, farbe: 'border-primary/40 hover:bg-primary/10 text-primary' },
];

/** Drei Knöpfe; jeder öffnet ein passendes Auswahlfenster. */
export default function BausteinPalette({ fundament, onHinzu }) {
  const [wahl, setWahl] = React.useState(null);
  const nehmen = (art, daten) => { onHinzu(art, daten); setWahl(null); };
  const aktiv = KNOEPFE.find((x) => x.k === wahl);
  return (
    <div className="space-y-2">
      {KNOEPFE.map(({ k, label, icon: Icon, farbe }) => (
        <button key={k} onClick={() => setWahl(k)} className={`flex w-full items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium transition ${farbe}`}>
          <Icon className="h-4 w-4" /> <span className="flex-1 text-left text-foreground">{label}</span> <Plus className="h-4 w-4" />
        </button>
      ))}
      <Dialog open={!!wahl} onOpenChange={(o) => !o && setWahl(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{aktiv?.label}</DialogTitle></DialogHeader>
          {wahl === 'uebung' && <UebungWahl fundament={fundament} onWahl={(d) => nehmen('uebung', d)} />}
          {wahl === 'standard' && <StandardfolieWahl onWahl={(d) => nehmen('standard', d)} />}
          {wahl === 'methode' && <MethodeWahl onWahl={(d) => nehmen('methode', d)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}