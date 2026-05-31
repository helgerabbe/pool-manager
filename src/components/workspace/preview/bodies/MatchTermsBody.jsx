/**
 * MatchTermsBody.jsx
 *
 * Interaktive Schüler-Vorschau für "Begriffe zuordnen":
 * Links: feste Begriffe mit leerem Slot.
 * Rechts: gemischter Pool aus richtigen Definitionen + Distraktoren.
 *
 * Bedienung: Slot anklicken (markiert blau) → Pool-Eintrag anklicken → wird
 * in den Slot gelegt. Erneuter Klick auf einen befüllten Slot löst die
 * Zuordnung wieder. "Prüfen" markiert pro Slot grün/rot, "Zurücksetzen"
 * stellt den Anfangszustand wieder her. Bei voller Korrektheit: Konfetti.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  // Pool: alle right-Werte + Distraktoren, gemischt. Jeder Eintrag bekommt eine stabile ID.
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
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [checked, setChecked] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    setAssignments(pairs.map(() => null));
    setSelectedSlot(null);
    setChecked(false);
    celebratedRef.current = false;
  }, [pairs.length, initialPool]);

  const usedPoolIds = new Set(assignments.filter(Boolean));
  const poolItems = initialPool.filter(it => !usedPoolIds.has(it.id));

  const handleSlotClick = (slotIdx) => {
    if (checked) return;
    if (assignments[slotIdx]) {
      // Slot befüllt → leeren
      setAssignments(prev => prev.map((v, i) => (i === slotIdx ? null : v)));
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot(slotIdx === selectedSlot ? null : slotIdx);
  };

  const handlePoolClick = (poolId) => {
    if (checked) return;
    if (selectedSlot === null) {
      // Nimm ersten freien Slot
      const freeIdx = assignments.findIndex(a => a === null);
      if (freeIdx === -1) return;
      setAssignments(prev => prev.map((v, i) => (i === freeIdx ? poolId : v)));
      return;
    }
    setAssignments(prev => prev.map((v, i) => (i === selectedSlot ? poolId : v)));
    setSelectedSlot(null);
  };

  const handleReset = () => {
    setAssignments(pairs.map(() => null));
    setSelectedSlot(null);
    setChecked(false);
    celebratedRef.current = false;
  };

  const handleCheck = () => setChecked(true);

  const isCorrect = (slotIdx) => {
    const item = initialPool.find(it => it.id === assignments[slotIdx]);
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
          Tipp: Klicke einen Begriff rechts an, dann den passenden Slot links — oder einfach hintereinander, dann werden die Slots der Reihe nach gefüllt.
        </p>
      )}

      {/* Spielfeld */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 overflow-y-auto">
        {/* Links: Begriffe + Slots */}
        <div className="space-y-2">
          {pairs.map((p, i) => {
            const assignedId = assignments[i];
            const assignedItem = assignedId ? initialPool.find(it => it.id === assignedId) : null;
            const slotSelected = selectedSlot === i && !checked;
            const correct = checked && isCorrect(i);
            const wrong = checked && assignedId && !correct;

            return (
              <div key={i} className="flex items-stretch gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] font-medium text-slate-800 flex items-center">
                  {p.left}
                </div>
                <div className="text-slate-300 flex items-center px-1">→</div>
                <button
                  type="button"
                  onClick={() => handleSlotClick(i)}
                  className={[
                    'flex-1 px-3 py-2 rounded-lg border text-[13px] text-left transition-all',
                    !assignedItem && !slotSelected && 'border-dashed border-slate-300 bg-white text-slate-400 italic hover:border-blue-400',
                    !assignedItem && slotSelected && 'border-dashed border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200',
                    assignedItem && !checked && 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
                    correct && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                    wrong && 'border-red-300 bg-red-50 text-red-900',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="flex items-center gap-2">
                    {checked && correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {checked && wrong && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className="flex-1">{assignedItem ? assignedItem.text : 'Hier ablegen …'}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Rechts: Pool */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Begriffe</p>
          <div className="flex flex-wrap gap-1.5 content-start">
            {poolItems.length === 0 && (
              <p className="text-xs text-slate-400 italic">Alle Begriffe verteilt.</p>
            )}
            {poolItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePoolClick(item.id)}
                disabled={checked}
                className="px-3 py-1.5 rounded-full border border-slate-300 bg-white text-[12px] text-slate-700 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      </div>

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