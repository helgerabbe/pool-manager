/**
 * MatchTermsBody.jsx
 *
 * Interaktive Schüler-Vorschau für "Begriffe zuordnen" — Drag & Drop.
 *
 * - Pool rechts: alle richtigen Definitionen + Distraktoren (gemischt).
 * - Slots links: ein Drop-Ziel pro Begriff.
 * - Ein Begriff lässt sich aus dem Pool in einen Slot, von Slot zu Slot oder
 *   zurück in den Pool ziehen. Click-Fallback (Pool-Eintrag anklicken → wird in
 *   den nächsten freien Slot gelegt) bleibt erhalten für mobile Nutzung ohne DnD.
 * - "Prüfen" markiert Slots grün/rot; "Zurücksetzen" stellt den Startzustand her.
 *   Bei voller Korrektheit: Konfetti.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchTermsBody({ fieldValues = {} }) {
  const pairs = useMemo(
    () => (Array.isArray(fieldValues.pairs) ? fieldValues.pairs : []).filter(p => p && p.left && p.right),
    [fieldValues.pairs]
  );
  const distractors = useMemo(
    () => (Array.isArray(fieldValues.distractors) ? fieldValues.distractors : [])
      .map(d => (typeof d === 'string' ? d : d?.value || d?.text || ''))
      .filter(Boolean),
    [fieldValues.distractors]
  );

  // Pool: alle right-Werte + Distraktoren. Stabile ID + correctFor-Index.
  const initialPool = useMemo(() => {
    const items = [
      ...pairs.map((p, i) => ({ id: `r-${i}`, text: p.right, correctFor: i })),
      ...distractors.map((d, i) => ({ id: `d-${i}`, text: d, correctFor: null })),
    ];
    return shuffle(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.length, distractors.length, fieldValues]);

  // assignments[slotIdx] = pool-id oder null
  const [assignments, setAssignments] = useState(() => pairs.map(() => null));
  const [checked, setChecked] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    setAssignments(pairs.map(() => null));
    setChecked(false);
    celebratedRef.current = false;
  }, [pairs.length, initialPool]);

  const itemById = (id) => initialPool.find(it => it.id === id) || null;
  const usedPoolIds = new Set(assignments.filter(Boolean));
  const poolItems = initialPool.filter(it => !usedPoolIds.has(it.id));

  // Click-Fallback: Pool-Eintrag in nächsten freien Slot
  const handlePoolClick = (poolId) => {
    if (checked) return;
    const freeIdx = assignments.findIndex(a => a === null);
    if (freeIdx === -1) return;
    setAssignments(prev => prev.map((v, i) => (i === freeIdx ? poolId : v)));
  };

  // Click auf befüllten Slot → leeren (zurück in Pool)
  const handleSlotClick = (slotIdx) => {
    if (checked) return;
    if (!assignments[slotIdx]) return;
    setAssignments(prev => prev.map((v, i) => (i === slotIdx ? null : v)));
  };

  const handleDragEnd = (result) => {
    if (checked) return;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    setAssignments(prev => {
      const next = [...prev];
      // 1) Quelle räumen
      if (source.droppableId.startsWith('slot-')) {
        const srcIdx = Number(source.droppableId.slice(5));
        next[srcIdx] = null;
      }
      // 2) Ziel füllen / Tausch
      if (destination.droppableId.startsWith('slot-')) {
        const dstIdx = Number(destination.droppableId.slice(5));
        const displaced = next[dstIdx];
        next[dstIdx] = draggableId;
        // Wenn Quelle ein Slot war und Ziel belegt war: tauschen
        if (displaced && source.droppableId.startsWith('slot-')) {
          const srcIdx = Number(source.droppableId.slice(5));
          next[srcIdx] = displaced;
        }
      }
      // Ziel = Pool → bereits durch Schritt 1 erledigt
      return next;
    });
  };

  const handleReset = () => {
    setAssignments(pairs.map(() => null));
    setChecked(false);
    celebratedRef.current = false;
  };

  const handleCheck = () => setChecked(true);

  const isCorrect = (slotIdx) => {
    const item = itemById(assignments[slotIdx]);
    return item && item.correctFor === slotIdx;
  };

  const allFilled = assignments.every(a => a !== null);
  const correctCount = checked ? assignments.filter((_, i) => isCorrect(i)).length : 0;
  const allCorrect = checked && correctCount === pairs.length;

  useEffect(() => {
    if (allCorrect && !celebratedRef.current) {
      celebratedRef.current = true;
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (_) { /* noop */ }
    }
  }, [allCorrect]);

  if (pairs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-slate-500 italic">Für diese Aufgabe sind noch keine Begriffspaare hinterlegt.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-3">
      {/* Anweisung */}
      {(fieldValues.instruction || fieldValues.aufgabentext) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 leading-relaxed shrink-0">
          {fieldValues.instruction || fieldValues.aufgabentext}
        </div>
      )}

      {/* Hilfetext */}
      {!checked && (
        <p className="text-[11px] text-slate-500 shrink-0">
          Ziehe einen Begriff von rechts auf den passenden Slot links — oder klicke ihn an, dann landet er im nächsten freien Slot.
        </p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Spielfeld */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Links: Begriffe + Slots */}
          <div className="space-y-2 overflow-y-auto pr-1">
            {pairs.map((p, i) => {
              const assignedId = assignments[i];
              const assignedItem = assignedId ? itemById(assignedId) : null;
              const correct = checked && isCorrect(i);
              const wrong = checked && assignedId && !correct;

              return (
                <div key={i} className="flex items-stretch gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] font-medium text-slate-800 flex items-center">
                    {p.left}
                  </div>
                  <div className="text-slate-300 flex items-center px-1">→</div>
                  <Droppable droppableId={`slot-${i}`} isDropDisabled={checked}>
                    {(dropProvided, dropSnapshot) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        onClick={() => handleSlotClick(i)}
                        className={[
                          'flex-1 min-h-[40px] px-3 py-2 rounded-lg border text-[13px] text-left transition-all',
                          !assignedItem && !dropSnapshot.isDraggingOver && 'border-dashed border-slate-300 bg-white text-slate-400 italic',
                          !assignedItem && dropSnapshot.isDraggingOver && 'border-dashed border-blue-500 bg-blue-50 ring-2 ring-blue-200',
                          assignedItem && !checked && 'border-blue-300 bg-blue-50 text-blue-900',
                          correct && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                          wrong && 'border-red-300 bg-red-50 text-red-900',
                        ].filter(Boolean).join(' ')}
                      >
                        {assignedItem ? (
                          <Draggable draggableId={assignedItem.id} index={0} isDragDisabled={checked}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={[
                                  'select-none cursor-grab active:cursor-grabbing flex items-center gap-2',
                                  dragSnapshot.isDragging && 'opacity-80',
                                ].filter(Boolean).join(' ')}
                              >
                                {checked && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {checked && wrong && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                <span className="flex-1">{assignedItem.text}</span>
                              </div>
                            )}
                          </Draggable>
                        ) : (
                          <span>Hier ablegen …</span>
                        )}
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>

          {/* Rechts: Pool */}
          <div className="flex flex-col min-h-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 shrink-0">Begriffe</p>
            <Droppable droppableId="pool" direction="horizontal" isDropDisabled={checked}>
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={[
                    'flex-1 min-h-0 overflow-y-auto rounded-lg p-2 flex flex-wrap gap-1.5 content-start transition-colors',
                    dropSnapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-slate-50/60',
                  ].join(' ')}
                >
                  {poolItems.length === 0 && (
                    <p className="text-xs text-slate-400 italic w-full text-center py-2">Alle Begriffe verteilt.</p>
                  )}
                  {poolItems.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx} isDragDisabled={checked}>
                      {(dragProvided, dragSnapshot) => (
                        <button
                          type="button"
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => handlePoolClick(item.id)}
                          disabled={checked}
                          className={[
                            'select-none cursor-grab active:cursor-grabbing',
                            'px-3 py-1.5 rounded-full border border-slate-300 bg-white text-[12px] text-slate-700',
                            'hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                            dragSnapshot.isDragging && 'shadow-lg ring-2 ring-blue-300',
                          ].filter(Boolean).join(' ')}
                        >
                          {item.text}
                        </button>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      {/* Footer: Aktionen + Feedback */}
      <div className="shrink-0 flex items-center gap-2 pt-2 border-t border-slate-200">
        {checked ? (
          <>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${allCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
              {allCorrect ? (<><Trophy className="w-4 h-4" /> Alles richtig zugeordnet!</>) : (<>{correctCount} von {pairs.length} richtig.</>)}
            </div>
            <Button size="sm" variant="outline" onClick={handleReset} className="ml-auto gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Nochmal versuchen
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={handleReset} className="gap-1.5 text-slate-500">
              <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
            </Button>
            <Button
              size="sm"
              onClick={handleCheck}
              disabled={!allFilled}
              className="ml-auto gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Prüfen
            </Button>
          </>
        )}
      </div>
    </div>
  );
}