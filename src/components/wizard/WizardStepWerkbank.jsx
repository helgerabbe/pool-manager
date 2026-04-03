import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';

export default function WizardStepWerkbank({ 
  structure = { themenfelder: [], lernpakete: [] },
  onStructureChange,
  onNext,
}) {
  const [editing, setEditing] = useState(null);

  const handleDragEnd = (result) => {
    // Hier würde die Drag-and-Drop-Logik implementiert
    // Für jetzt: einfache Platzhalter-Implementierung
    console.log('Drag ended:', result);
  };

  const handleEditTitle = (id, type, newTitle) => {
    if (type === 'themenfeld') {
      const updated = structure.themenfelder.map(tf =>
        tf.id === id ? { ...tf, titel: newTitle } : tf
      );
      onStructureChange({ ...structure, themenfelder: updated });
    } else if (type === 'lernpaket') {
      const updated = structure.lernpakete.map(lp =>
        lp.id === id ? { ...lp, titel_des_pakets: newTitle } : lp
      );
      onStructureChange({ ...structure, lernpakete: updated });
    }
    setEditing(null);
  };

  const handleDeleteItem = (id, type) => {
    if (type === 'themenfeld') {
      const updated = structure.themenfelder.filter(tf => tf.id !== id);
      onStructureChange({ ...structure, themenfelder: updated });
    } else if (type === 'lernpaket') {
      const updated = structure.lernpakete.filter(lp => lp.id !== id);
      onStructureChange({ ...structure, lernpakete: updated });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Werkbank: Struktur arrangieren</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verschieben Sie Themenfelder und Lernpakete per Drag & Drop, oder bearbeiten Sie Titel direkt.
        </p>
      </div>

      {/* Drag & Drop Bereich */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="structure" type="THEMENFELD">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-4 p-4 border rounded-lg transition-colors ${
                snapshot.isDraggingOver ? 'bg-primary/5 border-primary' : 'bg-card border-border'
              }`}
            >
              {structure.themenfelder.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Keine Themenfelder. Fügen Sie welche hinzu, um zu starten.
                </p>
              ) : (
                structure.themenfelder.map((tf, idx) => (
                  <Draggable key={tf.id} draggableId={tf.id} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-blue-50 border border-blue-200 rounded-lg p-4 transition-all ${
                          snapshot.isDragging ? 'shadow-lg bg-blue-100' : ''
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Themenfeld Header */}
                          <div className="flex items-center justify-between gap-2">
                            {editing?.id === tf.id && editing?.type === 'themenfeld' ? (
                              <Input
                                autoFocus
                                defaultValue={tf.titel}
                                onBlur={e => handleEditTitle(tf.id, 'themenfeld', e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleEditTitle(tf.id, 'themenfeld', e.target.value);
                                  }
                                }}
                                className="h-8"
                              />
                            ) : (
                              <>
                                <h4
                                  className="font-semibold text-sm text-foreground cursor-pointer hover:underline"
                                  onClick={() => setEditing({ id: tf.id, type: 'themenfeld' })}
                                >
                                  {tf.titel}
                                </h4>
                                <button
                                  onClick={() => handleDeleteItem(tf.id, 'themenfeld')}
                                  className="text-xs text-destructive hover:underline"
                                >
                                  Löschen
                                </button>
                              </>
                            )}
                          </div>

                          {/* Lernpakete für dieses Themenfeld */}
                          <Droppable droppableId={`lp-${tf.id}`} type="LERNPAKET">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`space-y-2 p-3 rounded-lg transition-colors ${
                                  snapshot.isDraggingOver
                                    ? 'bg-slate-100 border border-dashed border-slate-300'
                                    : 'bg-slate-50'
                                }`}
                              >
                                {structure.lernpakete
                                  .filter(lp => lp.themenfeld_id === tf.id)
                                  .map((lp, lpIdx) => (
                                    <Draggable key={lp.id} draggableId={lp.id} index={lpIdx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`bg-white border border-slate-200 rounded-lg p-2.5 transition-all ${
                                            snapshot.isDragging ? 'shadow-md' : ''
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            {editing?.id === lp.id && editing?.type === 'lernpaket' ? (
                                              <Input
                                                autoFocus
                                                defaultValue={lp.titel_des_pakets}
                                                onBlur={e => handleEditTitle(lp.id, 'lernpaket', e.target.value)}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter') {
                                                    handleEditTitle(lp.id, 'lernpaket', e.target.value);
                                                  }
                                                }}
                                                className="h-7 text-sm"
                                              />
                                            ) : (
                                              <>
                                                <p
                                                  className="text-sm text-foreground cursor-pointer hover:underline"
                                                  onClick={() => setEditing({ id: lp.id, type: 'lernpaket' })}
                                                >
                                                  {lp.titel_des_pakets}
                                                </p>
                                                <button
                                                  onClick={() => handleDeleteItem(lp.id, 'lernpaket')}
                                                  className="text-xs text-destructive hover:underline"
                                                >
                                                  ✕
                                                </button>
                                              </>
                                            )}
                                          </div>
                                          {lp.geschaetzte_dauer_minuten && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              ⏱ {lp.geschaetzte_dauer_minuten} Min
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline">Zurück</Button>
        <Button onClick={onNext} disabled={structure.themenfelder.length === 0} className="gap-2">
          <ChevronRight className="w-4 h-4" />
          Weiter: Lernziele
        </Button>
      </div>
    </div>
  );
}