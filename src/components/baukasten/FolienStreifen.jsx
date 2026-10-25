import React from 'react';
import { folienName } from '@/lib/stundenbaukasten';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';

/** Kompakte, horizontal scrollende Folienvorschau eines Bausteins. */
export default function FolienStreifen({ folien, kopf, onFolie }) {
  if (!folien?.length) return <p className="text-xs italic text-muted-foreground py-6">Noch keine Folien – öffnen oder füllen lassen.</p>;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {folien.map((f, i) => (
        <button key={f.id || i} onClick={() => onFolie(i)} className="group shrink-0 w-44 text-left">
          <div className="aspect-video overflow-hidden rounded-md border bg-card transition group-hover:ring-2 group-hover:ring-primary/40">
            <div className="pointer-events-none origin-top-left scale-[0.23] w-[435%]"><FolieAnzeige folie={f} kopf={kopf} /></div>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground"><b className="text-foreground">{i + 1}</b> {folienName(f)}</p>
        </button>
      ))}
    </div>
  );
}