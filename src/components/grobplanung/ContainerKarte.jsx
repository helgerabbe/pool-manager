import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

/** Status: aktiv eingestellt (grün) · Standard übernommen · Pflicht offen · optional leer. */
function status(pflicht, gesetzt, bearbeitet) {
  if (bearbeitet && gesetzt) return { text: 'Eingestellt', haken: true, pill: 'bg-chart-3 text-primary-foreground', karte: 'bg-chart-3/10' };
  if (gesetzt) return { text: 'Standard', pill: 'border border-chart-3 text-chart-3', karte: 'bg-card' };
  if (pflicht) return { text: 'Pflicht', pill: 'bg-accent text-accent-foreground', karte: 'bg-card' };
  return { text: 'optional', pill: 'bg-muted text-muted-foreground', karte: 'bg-card' };
}

/** Kompakter Vorgaben-Container: Bereich, Status und aktueller Stand auf einen Blick. */
export default function ContainerKarte({ icon: Icon, titel, pflicht, stand, gesetzt, bearbeitet, rand, onClick }) {
  const s = status(pflicht, gesetzt, bearbeitet);
  return (
    <button onClick={onClick} className={`group flex h-full flex-col gap-2 rounded-xl border border-l-4 p-4 text-left transition-all hover:shadow-md ${s.karte} ${rand}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="flex-1 text-sm font-semibold">{titel}</p>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.pill}`}>{s.haken && <CheckCircle2 className="h-3 w-3" />}{s.text}</span>
      </div>
      <p className={`line-clamp-3 flex-1 text-xs ${gesetzt ? 'text-foreground' : 'text-muted-foreground italic'}`}>{stand}</p>
      <span className="flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">Bearbeiten <ChevronRight className="h-3 w-3" /></span>
    </button>
  );
}