import React from 'react';
import { Plus, ListChecks, LayoutTemplate, Shapes, Package } from 'lucide-react';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { FAVORITEN, alsFolie } from './wahl/StandardfolieWahl';
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
  const favoriten = STANDARD_FOLIEN.filter((s) => FAVORITEN.includes(s.key));
  return (
    <div className="space-y-2">
      <button onClick={() => onHinzu('inhalt', { titel: 'Neue Kiste' })} className="flex w-full items-center gap-2 rounded-xl border border-dashed bg-card p-3 text-sm font-medium hover:border-primary">
        <Package className="h-4 w-4 text-muted-foreground" /> <span className="flex-1 text-left">Leere Kiste (ohne Methode)</span> <Plus className="h-4 w-4" />
      </button>
      {KNOEPFE.map(({ k, label, icon: Icon, farbe }) => (
        <button key={k} onClick={() => setWahl(k)} className={`flex w-full items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium transition ${farbe}`}>
          <Icon className="h-4 w-4" /> <span className="flex-1 text-left text-foreground">{label}</span> <Plus className="h-4 w-4" />
        </button>
      ))}
      <p className="pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">★ Häufig genutzt</p>
      <div className="flex flex-wrap gap-1.5">
        {favoriten.map((s) => (
          <button key={s.key} onClick={() => onHinzu('standard', { titel: s.name, folien: [{ ...alsFolie(s), id: `${s.key}${Date.now()}` }] })}
            className="rounded-full border bg-card px-2.5 py-1 text-xs hover:border-chart-4 hover:text-chart-4">{s.name}</button>
        ))}
      </div>
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