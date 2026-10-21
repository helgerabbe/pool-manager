import React from 'react';
import { ChevronRight, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

/** Status der Karte: eingestellt (grün), Pflicht offen (orange), optional mit Standard (neutral, alles gut). */
function status(pflicht, gesetzt) {
  if (gesetzt) return { Icon: CheckCircle2, text: 'Eingestellt', pill: 'bg-chart-3 text-primary-foreground', karte: 'bg-chart-3/10', fuss: 'text-chart-3', fussText: 'Von dir eingestellt' };
  if (pflicht) return { Icon: AlertCircle, text: 'Pflicht', pill: 'bg-accent text-accent-foreground', karte: 'bg-card', fuss: 'text-accent', fussText: 'Muss noch ausgefüllt werden' };
  return { Icon: Circle, text: 'optional', pill: 'bg-muted text-muted-foreground', karte: 'bg-card', fuss: 'text-muted-foreground', fussText: 'Standard wird übernommen, alles gut' };
}

/** Kompakter Vorgaben-Container: Bereich, Status und aktueller Stand auf einen Blick. */
export default function ContainerKarte({ icon: Icon, titel, pflicht, stand, gesetzt, rand, onClick }) {
  const s = status(pflicht, gesetzt);
  return (
    <button onClick={onClick} className={`group flex h-full flex-col gap-2 rounded-xl border border-l-4 p-4 text-left transition-all hover:shadow-md ${s.karte} ${rand}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="flex-1 text-sm font-semibold">{titel}</p>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.pill}`}>{gesetzt && <s.Icon className="h-3 w-3" />}{s.text}</span>
      </div>
      <p className={`line-clamp-3 flex-1 text-xs ${gesetzt ? 'text-foreground' : 'text-muted-foreground italic'}`}>{stand}</p>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`flex items-center gap-1 ${s.fuss}`}><s.Icon className="h-3 w-3" />{s.fussText}</span>
        <span className="flex items-center gap-1 text-primary opacity-70 group-hover:opacity-100">Bearbeiten <ChevronRight className="h-3 w-3" /></span>
      </div>
    </button>
  );
}