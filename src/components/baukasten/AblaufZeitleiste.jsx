import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BausteinZeile from './BausteinZeile';
import PhasenKopf from './PhasenKopf';
import { folieVerschieben } from '@/lib/stundenbaukasten';

/** Vertikaler Stundenablauf in optionalen Phasen; Reihenfolge per Ziehen. */
export default function AblaufZeitleiste({ bausteine, kopf, onReihenfolge, onOeffnen, onEntfernen, onFolieHinzu, onFolien, onBearbeiten, onPhase }) {
  const ende = ({ source, destination, type }) => {
    if (!destination || destination.index === source.index) return;
    if (type === 'folie') {
      if (destination.droppableId !== source.droppableId) return;
      const b = bausteine.find((x) => `folien:${x.id}` === source.droppableId);
      onFolien(b, folieVerschieben(b.folien, source.index, destination.index));
      return;
    }
    const l = [...bausteine]; const [x] = l.splice(source.index, 1); l.splice(destination.index, 0, x);
    onReihenfolge(l);
  };
  if (!bausteine.length) return (
    <div className="rounded-2xl border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
      Leg einfach los: rechts einen leeren Block anlegen, eine Methode wählen oder eine Folie hineinziehen.
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
                  <div ref={d.innerRef} {...d.draggableProps} className="space-y-2">
                    <PhasenKopf phase={b.phase} neu={!!b.phase} onPhase={(ph) => onPhase(b, ph)} />
                    <BausteinZeile b={b} nr={i + 1} kopf={kopf} griff={d.dragHandleProps} onOeffnen={(n) => onOeffnen(b.id, n)} onEntfernen={() => onEntfernen(b.id)}
                      onFolieHinzu={(f) => onFolieHinzu(b, f)} onFolien={(l) => onFolien(b, l)} onBearbeiten={(n) => onBearbeiten(b, n)} />
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