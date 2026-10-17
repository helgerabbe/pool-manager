import React from 'react';
import { ChevronRight } from 'lucide-react';

/** Kompakter Vorgaben-Container: Bereich, Pflicht/optional und aktueller Stand auf einen Blick. */
export default function ContainerKarte({ icon: Icon, titel, pflicht, stand, gesetzt, rand, onClick }) {
  return (
    <button onClick={onClick} className={`group flex h-full flex-col gap-2 rounded-xl border border-l-4 bg-card p-4 text-left transition-all hover:shadow-md ${rand}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="flex-1 text-sm font-semibold">{titel}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pflicht ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{pflicht ? 'Pflicht' : 'optional'}</span>
      </div>
      <p className={`line-clamp-3 flex-1 text-xs ${gesetzt ? 'text-foreground' : 'text-muted-foreground italic'}`}>{stand}</p>
      <span className="flex items-center gap-1 text-xs text-primary opacity-70 group-hover:opacity-100">Bearbeiten <ChevronRight className="h-3 w-3" /></span>
    </button>
  );
}