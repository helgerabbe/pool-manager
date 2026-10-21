import React from 'react';
import { Switch } from '@/components/ui/switch';
import Umschalter from './Umschalter';

/** Erweiterungen: Skala mit mehreren Karten, Kanban mit Überschneidung, Abstimmung in zwei Runden. */
export default function ErweiterungOptionen({ el, setze }) {
  if (el.typ === 'skala') return (
    <Umschalter titel="Auf der Skala liegt" optionen={[['eine', 'Eine Position'], ['karten', 'Mehrere Karten']]} wert={el.belegung || 'eine'} setze={(v) => setze({ belegung: v })} />
  );
  if (el.typ === 'kanban') return (
    <Umschalter titel="Bereiche" optionen={[['spalten', 'Spalten'], ['venn', 'Überlappend (Venn)']]} wert={el.bereiche || 'spalten'} setze={(v) => setze({ bereiche: v })} />
  );
  if (el.typ === 'abstimmung') return (
    <label className="flex items-start justify-between gap-3">
      <span><span className="block text-sm font-medium">Zwei Runden</span><span className="block text-xs text-muted-foreground">Abstimmen, diskutieren, erneut abstimmen; danach Vorher-nachher-Vergleich (Peer Instruction).</span></span>
      <Switch checked={!!el.zwei_runden} onCheckedChange={(v) => setze({ zwei_runden: v })} />
    </label>
  );
  return null;
}