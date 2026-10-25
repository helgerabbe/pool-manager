import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Link2, Unlink } from 'lucide-react';
import { folienName, verbundUmschalten } from '@/lib/stundenbaukasten';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';

/** Kompakte, horizontale Folienvorschau eines Bausteins; Reihenfolge per Ziehen, Folien lassen sich zu einem Verbund koppeln. */
export default function FolienStreifen({ folien, kopf, onFolie, dropId, onFolien }) {
  if (!folien?.length) return <p className="text-xs italic text-muted-foreground py-6">Noch keine Folien – öffnen, füllen lassen oder eine Folie hineinziehen.</p>;
  const verbunden = (i) => folien[i]?.verbund && folien[i].verbund === folien[i + 1]?.verbund;
  return (
    <Droppable droppableId={dropId || 'streifen'} type="folie" direction="horizontal" isDropDisabled={!dropId}>
      {(p) => (
        <div ref={p.innerRef} {...p.droppableProps} className="flex overflow-x-auto pb-2">
          {folien.map((f, i) => (
            <Draggable key={f.id || i} draggableId={`${dropId}:${f.id || i}`} index={i} isDragDisabled={!dropId}>
              {(d) => (
                <div ref={d.innerRef} {...d.draggableProps} {...d.dragHandleProps} className="flex shrink-0 items-start">
                  <button onClick={() => onFolie(i)} className="group w-44 text-left">
                    <div className={`aspect-video overflow-hidden rounded-md border bg-card transition group-hover:ring-2 group-hover:ring-primary/40 ${f.verbund ? 'border-chart-4' : ''}`}>
                      <div className="pointer-events-none origin-top-left scale-[0.23] w-[435%]"><FolieAnzeige folie={f} kopf={kopf} /></div>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground"><b className="text-foreground">{i + 1}</b> {folienName(f)}</p>
                  </button>
                  {i < folien.length - 1 && (
                    <button disabled={!onFolien} onClick={() => onFolien(verbundUmschalten(folien, i))}
                      title={verbunden(i) ? 'Verbund lösen' : 'Mit nächster Folie fest verbinden'}
                      className={`mx-0.5 mt-9 flex h-6 w-6 items-center justify-center rounded-full ${verbunden(i) ? 'bg-chart-4 text-primary-foreground' : 'text-muted-foreground/40 hover:bg-muted hover:text-foreground'}`}>
                      {verbunden(i) ? <Link2 className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              )}
            </Draggable>
          ))}
          {p.placeholder}
        </div>
      )}
    </Droppable>
  );
}