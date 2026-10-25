import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BausteinZeile from './BausteinZeile';

/** Vertikaler Stundenablauf; Reihenfolge per Ziehen. */
export default function AblaufZeitleiste({ bausteine, kopf, onReihenfolge, onOeffnen, onEntfernen, onFolieHinzu }) {
  const ende = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const l = [...bausteine]; const [x] = l.splice(source.index, 1); l.splice(destination.index, 0, x);
    onReihenfolge(l);
  };
  if (!bausteine.length) return (
    <div className="rounded-2xl border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
      Der Ablauf ist noch leer. Füge rechts Methoden, Inhaltsfolien oder Übungen ein – oder lass dir einen Vorschlag machen.
    </div>
  );
  return (
    <DragDropContext onDragEnd={ende}>
      <Droppable droppableId="ablauf">
        {(p) => (
          <div ref={p.innerRef} {...p.droppableProps} className="space-y-3">
            {bausteine.map((b, i) => (
              <Draggable key={b.id} draggableId={b.id} index={i}>
                {(d) => (
                  <div ref={d.innerRef} {...d.draggableProps}>
                    <BausteinZeile b={b} nr={i + 1} kopf={kopf} griff={d.dragHandleProps} onOeffnen={(n) => onOeffnen(b.id, n)} onEntfernen={() => onEntfernen(b.id)} onFolieHinzu={(f) => onFolieHinzu(b, f)} />
                  </div>
                )}
              </Draggable>
            ))}
            {p.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}