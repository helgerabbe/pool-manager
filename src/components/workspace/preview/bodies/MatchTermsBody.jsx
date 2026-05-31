/**
 * MatchTermsBody.jsx
 *
 * Interaktive Schüler-Vorschau für "Begriffe zuordnen".
 * Nutzt bewusst eine eigene Pointer-Drag-Lösung statt @hello-pangea/dnd,
 * weil die Vorschau in Dialogen/iPad-Frames mit transformierten Containern läuft.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle2, XCircle, Trophy } from 'lucide-react';
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

  const initialPool = useMemo(() => {
    const items = [
      ...pairs.map((p, i) => ({ id: `r-${i}`, text: p.right, correctFor: i })),
      ...distractors.map((d, i) => ({ id: `d-${i}`, text: d, correctFor: null })),
    ];
    return shuffle(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.length, distractors.length, fieldValues]);

  const [assignments, setAssignments] = useState(() => pairs.map(() => null));
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState(null);
  const celebratedRef = useRef(false);

  useEffect(() => {
    setAssignments(pairs.map(() => null));
    setChecked(false);
    setDragging(null);
    celebratedRef.current = false;
  }, [pairs.length, initialPool]);

  const itemById = (id) => initialPool.find(it => it.id === id) || null;
  const usedPoolIds = new Set(assignments.filter(Boolean));
  const poolItems = initialPool.filter(it => !usedPoolIds.has(it.id));

  const moveItemToSlot = (itemId, targetSlot, sourceSlot = null) => {
    setAssignments(prev => {
      const next = [...prev];
      const displaced = next[targetSlot];
      if (sourceSlot !== null) next[sourceSlot] = null;
      else {
        const existingSlot = next.findIndex(v => v === itemId);
        if (existingSlot >= 0) next[existingSlot] = null;
      }
      next[targetSlot] = itemId;
      if (displaced && sourceSlot !== null && sourceSlot !== targetSlot) next[sourceSlot] = displaced;
      return next;
    });
  };

  const moveItemToPool = (itemId) => {
    setAssignments(prev => prev.map(v => (v === itemId ? null : v)));
  };

  const handlePoolClick = (poolId) => {
    if (checked || dragging) return;
    const freeIdx = assignments.findIndex(a => a === null);
    if (freeIdx === -1) return;
    moveItemToSlot(poolId, freeIdx);
  };

  const handleSlotClick = (slotIdx) => {
    if (checked || dragging || !assignments[slotIdx]) return;
    moveItemToPool(assignments[slotIdx]);
  };

  const startDrag = (event, itemId, sourceSlot = null) => {
    if (checked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    setDragging({
      itemId,
      sourceSlot,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event) => {
      event.preventDefault();
      setDragging(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev);
    };

    const handleUp = (event) => {
      event.preventDefault();
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const slotNode = target?.closest?.('[data-match-drop-slot]');
      const poolNode = target?.closest?.('[data-match-drop-pool]');

      if (slotNode) {
        moveItemToSlot(dragging.itemId, Number(slotNode.dataset.matchDropSlot), dragging.sourceSlot);
      } else if (poolNode) {
        moveItemToPool(dragging.itemId);
      }
      setDragging(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });
    window.addEventListener('pointercancel', handleUp, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging]);

  const handleReset = () => {
    setAssignments(pairs.map(() => null));
    setChecked(false);
    setDragging(null);
    celebratedRef.current = false;
  };

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
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }, [allCorrect]);

  if (pairs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-slate-500 italic">Für diese Aufgabe sind noch keine Begriffspaare hinterlegt.</p>
      </div>
    );
  }

  const FloatingChip = () => {
    if (!dragging || typeof document === 'undefined') return null;
    const item = itemById(dragging.itemId);
    if (!item) return null;
    return createPortal(
      <div
        className="fixed z-[10050] pointer-events-none select-none px-3 py-1.5 rounded-full border border-blue-400 bg-white text-[12px] text-blue-900 shadow-xl ring-2 ring-blue-200"
        style={{
          left: dragging.x - dragging.offsetX,
          top: dragging.y - dragging.offsetY,
          width: dragging.width,
        }}
      >
        {item.text}
      </div>,
      document.body
    );
  };

  return (
    <div className="h-full flex flex-col px-6 py-4 gap-3 touch-none">
      {(fieldValues.instruction || fieldValues.aufgabentext) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 leading-relaxed shrink-0">
          {fieldValues.instruction || fieldValues.aufgabentext}
        </div>
      )}

      {!checked && (
        <p className="text-[11px] text-slate-500 shrink-0">
          Ziehe einen Begriff von rechts auf den passenden Slot links — oder klicke ihn an, dann landet er im nächsten freien Slot.
        </p>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 overflow-hidden">
        <div className="space-y-2 overflow-y-auto pr-1">
          {pairs.map((p, i) => {
            const assignedId = assignments[i];
            const assignedItem = assignedId ? itemById(assignedId) : null;
            const correct = checked && isCorrect(i);
            const wrong = checked && assignedId && !correct;
            const isDragged = dragging?.itemId === assignedId;

            return (
              <div key={i} className="flex items-stretch gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] font-medium text-slate-800 flex items-center">
                  {p.left}
                </div>
                <div className="text-slate-300 flex items-center px-1">→</div>
                <div
                  data-match-drop-slot={i}
                  onClick={() => handleSlotClick(i)}
                  className={[
                    'flex-1 min-h-[40px] px-3 py-2 rounded-lg border text-[13px] text-left transition-all',
                    !assignedItem && 'border-dashed border-slate-300 bg-white text-slate-400 italic',
                    assignedItem && !checked && 'border-blue-300 bg-blue-50 text-blue-900',
                    correct && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                    wrong && 'border-red-300 bg-red-50 text-red-900',
                  ].filter(Boolean).join(' ')}
                >
                  {assignedItem ? (
                    <div
                      onPointerDown={(e) => startDrag(e, assignedItem.id, i)}
                      className={[
                        'select-none cursor-grab active:cursor-grabbing flex items-center gap-2 touch-none',
                        isDragged && 'opacity-30',
                      ].filter(Boolean).join(' ')}
                    >
                      {checked && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {checked && wrong && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className="flex-1">{assignedItem.text}</span>
                    </div>
                  ) : (
                    <span>Hier ablegen …</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col min-h-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 shrink-0">Begriffe</p>
          <div data-match-drop-pool className="flex-1 min-h-0 overflow-y-auto rounded-lg p-2 flex flex-wrap gap-1.5 content-start bg-slate-50/60">
            {poolItems.length === 0 && (
              <p className="text-xs text-slate-400 italic w-full text-center py-2">Alle Begriffe verteilt.</p>
            )}
            {poolItems.map((item) => {
              const isDragged = dragging?.itemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(e) => startDrag(e, item.id)}
                  onClick={() => handlePoolClick(item.id)}
                  disabled={checked}
                  className={[
                    'select-none cursor-grab active:cursor-grabbing touch-none',
                    'px-3 py-1.5 rounded-full border border-slate-300 bg-white text-[12px] text-slate-700',
                    'hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                    isDragged && 'opacity-30',
                  ].filter(Boolean).join(' ')}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <FloatingChip />

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
              onClick={() => setChecked(true)}
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