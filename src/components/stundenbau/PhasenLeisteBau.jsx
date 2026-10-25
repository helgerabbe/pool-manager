import React from 'react';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';

/** Phasen der Stunde mit Baustand. */
export default function PhasenLeisteBau({ phasen, staende, aktiv, onWahl }) {
  return (
    <div className="space-y-1">
      {phasen.map((p, i) => {
        const s = staende[i];
        const Icon = s?.fertig ? CheckCircle2 : s?.folien?.length ? CircleDot : Circle;
        return (
          <button key={i} type="button" onClick={() => onWahl(i)}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${aktiv === i ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
            <Icon className={`w-4 h-4 shrink-0 ${s?.fertig ? 'text-chart-3' : ''}`} />
            <span className="flex-1 truncate">{i + 1}. {p.name}</span>
            <span className="text-[11px] text-muted-foreground">{s?.folien?.length ? `${s.folien.length} F.` : `${p.minuten || ''}′`}</span>
          </button>
        );
      })}
    </div>
  );
}