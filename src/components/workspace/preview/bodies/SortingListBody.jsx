/**
 * SortingListBody.jsx
 *
 * Interaktive Schüler-Vorschau für "Reihenfolge / Sortierung".
 * Eigene Pointer-Drag-Lösung (kein @hello-pangea/dnd), da die Vorschau in
 * transformierten Dialog-/iPad-Containern läuft.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle2, XCircle, Trophy, GripVertical } from 'lucide-react';
import confetti from 'canvas-confetti';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SortingListBody({ fieldValues = {} }) {
  const correctOrder = useMemo(
    () => (Array.isArray(fieldValues.orderedItems) ? fieldValues.orderedItems : [])
      .map(s => String(s || '').trim())
      .filter(Boolean),
    [fieldValues.orderedItems]
  );

  // Stabile Items mit Index = korrekte Position
  const baseItems = useMemo(
    () => correctOrder.map((text, i) => ({ id: `s-${i}`, text, correctIdx: i })),
    [correctOrder]
  );

  const initialOrder = useMemo(() => {
    if (baseItems.length < 2) return baseItems;
    let shuffled = shuffle(baseItems);
    // Sicherstellen, dass nicht zufällig schon korrekt sortiert
    if (shuffled.every((it, i) => it.correctIdx === i)) shuffled = shuffle(baseItems);
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseItems]);

  const [order, setOrder] = useState(initialOrder);
  const [checked, setChecked] = useState(false);
  const [dragging, setDragging] = useState(null);
  const celebratedRef = useRef(false);

  useEffect(() => {
    setOrder(initialOrder);
    setChecked(false);
    setDragging(null);
    celebratedRef.current = false;
  }, [initialOrder]);

  const startDrag = (event, itemId) => {
    if (checked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    setDragging({
      itemId,
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
      setDragging(prev => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const rowNode = target?.closest?.('[data-sort-row]');
      if (!rowNode) return;
      const overId = rowNode.dataset.sortRow;
      setOrder(prev => {
        const fromIdx = prev.findIndex(it => it.id === dragging.itemId);
        const toIdx = prev.findIndex(it => it.id === overId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
    };

    const handleUp = (event) => {
      event.preventDefault();
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
    setOrder(initialOrder);
    setChecked(false);
    setDragging(null);
    celebratedRef.current = false;
  };

  const isRowCorrect = (idx) => order[idx]?.correctIdx === idx;
  const correctCount = checked ? order.filter((_, i) => isRowCorrect(i)).length : 0;
  const allCorrect = checked && correctCount === order.length;

  useEffect(() => {
    if (allCorrect && !celebratedRef.current) {
      celebratedRef.current = true;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }, [allCorrect]);

  if (correctOrder.length < 2) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-slate-500 italic">Für diese Aufgabe sind noch keine Sortier-Elemente hinterlegt.</p>
      </div>
    );
  }

  const FloatingChip = () => {
    if (!dragging || typeof document === 'undefined') return null;
    const item = order.find(it => it.id === dragging.itemId);
    if (!item) return null;
    return createPortal(
      <div
        className="fixed z-[10050] pointer-events-none select-none px-3 py-2 rounded-lg border border-blue-400 bg-white text-[13px] text-blue-900 shadow-xl ring-2 ring-blue-200 flex items-center gap-2"
        style={{ left: dragging.x - dragging.offsetX, top: dragging.y - dragging.offsetY, width: dragging.width }}
      >
        <GripVertical className="w-4 h-4 text-blue-400" />
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
          Ziehe die Elemente in die richtige Reihenfolge.
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {order.map((item, i) => {
          const correct = checked && isRowCorrect(i);
          const wrong = checked && !correct;
          const isDragged = dragging?.itemId === item.id;
          return (
            <div
              key={item.id}
              data-sort-row={item.id}
              onPointerDown={(e) => startDrag(e, item.id)}
              className={[
                'select-none touch-none flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] transition-all',
                checked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                !checked && 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50',
                correct && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                wrong && 'border-red-300 bg-red-50 text-red-900',
                isDragged && 'opacity-30',
              ].filter(Boolean).join(' ')}
            >
              <span className="w-6 text-center font-bold text-slate-400 shrink-0">{i + 1}.</span>
              {!checked && <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />}
              {checked && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {checked && wrong && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className="flex-1">{item.text}</span>
            </div>
          );
        })}
      </div>

      <FloatingChip />

      <div className="shrink-0 flex items-center gap-2 pt-2 border-t border-slate-200">
        {checked ? (
          <>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${allCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
              {allCorrect ? (<><Trophy className="w-4 h-4" /> Perfekt sortiert!</>) : (<>{correctCount} von {order.length} an der richtigen Stelle.</>)}
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