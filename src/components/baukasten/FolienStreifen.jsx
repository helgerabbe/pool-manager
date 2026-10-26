import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Link2, Unlink, Pencil, X } from 'lucide-react';
import { folienName, verbundUmschalten, verbundBereich } from '@/lib/stundenbaukasten';
import { istFreieFolie } from '@/lib/schnellFolien';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';

/** Kompakte, horizontale Folienvorschau eines Bausteins; Reihenfolge per Ziehen, Verbünde, Stift = Designer, X = entfernen. */
export default function FolienStreifen({ folien, kopf, onFolie, dropId, onFolien, onBearbeiten }) {
  if (!folien?.length) return <p className="text-xs italic text-muted-foreground py-6">Noch keine Folien – über „+ Folie“ eine Folie oder einen Film einfügen.</p>;
  const verbunden = (i) => folien[i]?.verbund && folien[i].verbund === folien[i + 1]?.verbund;
  const entfernen = (i) => {
    const [a, z] = verbundBereich(folien, i);
    if (z > a && !window.confirm(`Diese Folie gehört zu einem Verbund aus ${z - a + 1} Folien. Den ganzen Verbund entfernen? (Zum Einzellöschen vorher die Verbindung lösen.)`)) return;
    onFolien(folien.filter((_, j) => j < a || j > z));
  };
  return (
    <Droppable droppableId={dropId || 'streifen'} type="folie" direction="horizontal" isDropDisabled={!dropId}>
      {(p) => (
        <div ref={p.innerRef} {...p.droppableProps} className="flex overflow-x-auto pb-2">
          {folien.map((f, i) => (
            <Draggable key={f.id || i} draggableId={`${dropId}:${f.id || i}`} index={i} isDragDisabled={!dropId}>
              {(d) => (
                <div ref={d.innerRef} {...d.draggableProps} {...d.dragHandleProps} className="flex shrink-0 items-start">
                  <div className="group relative w-44">
                    <button onClick={() => (onBearbeiten && istFreieFolie(f) ? onBearbeiten(i) : onFolie(i))} className="block w-full text-left">
                      <div className={`aspect-video overflow-hidden rounded-md border bg-card transition group-hover:ring-2 group-hover:ring-primary/40 ${f.verbund ? 'border-chart-4' : ''}`}>
                        <div className="pointer-events-none origin-top-left scale-[0.23] w-[435%]"><FolieAnzeige folie={f} kopf={kopf} /></div>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground"><b className="text-foreground">{i + 1}</b> {folienName(f)}</p>
                    </button>
                    {onFolien && (
                      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                        {onBearbeiten && istFreieFolie(f) && <button onClick={() => onBearbeiten(i)} title="Im Foliendesigner bearbeiten" className="rounded bg-card/95 p-1 shadow hover:text-primary"><Pencil className="h-3 w-3" /></button>}
                        <button onClick={() => entfernen(i)} title="Folie entfernen" className="rounded bg-card/95 p-1 shadow hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
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