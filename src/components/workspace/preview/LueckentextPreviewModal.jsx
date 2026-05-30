/**
 * LueckentextPreviewModal.jsx
 *
 * Voll interaktive Schüler-Vorschau für Lückentext-Masteraufgaben.
 * Lehrkräfte können die Aufgabe so erleben, wie Schüler:innen sie später
 * bearbeiten: Wörter aus der Wortbank werden per Drag & Drop oder Klick
 * in die Lücken gezogen, beim Überprüfen gibt es bei vollständig richtiger
 * Lösung eine Konfetti-Belohnung.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, RotateCcw, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import PhaseBadge from '@/components/workspace/preview/PhaseBadge';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseLueckentext(rawText) {
  // Liefert Tokens und eine Liste der Lücken-Slots (mit korrekter Lösung).
  const parts = (rawText || '').split(/(\[[^\]]+\])/g).filter(p => p.length > 0);
  const tokens = [];
  const slots = [];
  parts.forEach((part, idx) => {
    const m = part.match(/^\[([^\]]+)\]$/);
    if (m) {
      const slotId = `slot-${idx}`;
      slots.push({ id: slotId, solution: m[1] });
      tokens.push({ type: 'gap', slotId, solution: m[1] });
    } else {
      tokens.push({ type: 'text', value: part });
    }
  });
  return { tokens, slots };
}

export default function LueckentextPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Lückentext', phase = 'Übung' }) {
  const rawText = fieldValues.lueckentext || '';
  const distraktoren = Array.isArray(fieldValues.distraktoren) ? fieldValues.distraktoren : [];

  const { tokens, slots } = useMemo(() => parseLueckentext(rawText), [rawText]);

  // Wortbank: alle Lösungen + Distraktoren, gemischt
  const initialBank = useMemo(() => {
    const solutions = slots.map(s => s.solution);
    return shuffle([...solutions, ...distraktoren]).map((w, i) => ({ id: `w-${i}-${w}`, text: w }));
  }, [slots, distraktoren]);

  // assignments: { [slotId]: { id, text } | null }
  const [assignments, setAssignments] = useState({});
  const [bank, setBank] = useState(initialBank);
  const [checked, setChecked] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState(null); // für Klick-Modus auf Mobile
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Reset bei jedem Öffnen
      setAssignments({});
      setBank(initialBank);
      setChecked(false);
      setSelectedWordId(null);
    }
  }, [open, initialBank]);

  const placeWord = (wordId, slotId) => {
    const word = bank.find(w => w.id === wordId) || Object.values(assignments).find(w => w && w.id === wordId);
    if (!word) return;
    setChecked(false);
    setAssignments(prev => {
      const next = { ...prev };
      // Wenn das Wort schon in einem anderen Slot war: freigeben
      for (const sid of Object.keys(next)) {
        if (next[sid]?.id === wordId) next[sid] = null;
      }
      // Wenn der Ziel-Slot schon belegt war: das alte Wort zurück in die Bank
      const previouslyInSlot = next[slotId];
      next[slotId] = word;
      // Bank aktualisieren
      setBank(b => {
        let nb = b.filter(w => w.id !== wordId);
        if (previouslyInSlot && !nb.find(w => w.id === previouslyInSlot.id)) {
          nb = [...nb, previouslyInSlot];
        }
        return nb;
      });
      return next;
    });
    setSelectedWordId(null);
  };

  const removeFromSlot = (slotId) => {
    const word = assignments[slotId];
    if (!word) return;
    setChecked(false);
    setAssignments(prev => ({ ...prev, [slotId]: null }));
    setBank(b => (b.find(w => w.id === word.id) ? b : [...b, word]));
  };

  const handleReset = () => {
    setAssignments({});
    setBank(initialBank);
    setChecked(false);
    setSelectedWordId(null);
  };

  const allFilled = slots.length > 0 && slots.every(s => assignments[s.id]);
  const correctnessMap = useMemo(() => {
    const map = {};
    slots.forEach(s => {
      const a = assignments[s.id];
      map[s.id] = a ? a.text.trim().toLowerCase() === s.solution.trim().toLowerCase() : null;
    });
    return map;
  }, [assignments, slots]);

  const correctCount = Object.values(correctnessMap).filter(v => v === true).length;
  const allCorrect = checked && slots.length > 0 && correctCount === slots.length;

  const handleCheck = () => {
    setChecked(true);
    if (slots.every(s => {
      const a = assignments[s.id];
      return a && a.text.trim().toLowerCase() === s.solution.trim().toLowerCase();
    })) {
      // Konfetti-Belohnung 🎉
      const rect = containerRef.current?.getBoundingClientRect();
      const origin = rect
        ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 3) / window.innerHeight }
        : { x: 0.5, y: 0.5 };
      confetti({ particleCount: 120, spread: 80, origin, startVelocity: 45, scalar: 1.1 });
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin, startVelocity: 35 }), 200);
    }
  };

  // Drag & Drop Handler
  const onDragStartWord = (e, wordId) => {
    e.dataTransfer.setData('text/plain', wordId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropSlot = (e, slotId) => {
    e.preventDefault();
    const wordId = e.dataTransfer.getData('text/plain');
    if (wordId) placeWord(wordId, slotId);
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const onWordClick = (wordId) => {
    if (selectedWordId === wordId) {
      setSelectedWordId(null);
    } else {
      setSelectedWordId(wordId);
    }
  };
  const onSlotClick = (slotId) => {
    if (selectedWordId) {
      placeWord(selectedWordId, slotId);
    } else if (assignments[slotId]) {
      removeFromSlot(slotId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sehen Schüler:innen die Aufgabe auf dem iPad (960 × 600 px Slide). Erscheint hier ein Scrollbalken, passt der Inhalt nicht auf eine Seite.
          </p>
        </DialogHeader>

        <div className="pt-3" ref={containerRef}>
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
          <article className="bg-white h-full flex flex-col">
            {/* Schlanker Phasen-Untertitel */}
            <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-800 shrink-0">
              <span className="font-semibold">Übung ·</span> Hier übst du, was du gelernt hast.
            </div>
            {/* Wortbank — kompakt, inline */}
            <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" />
                  Wortbank
                </span>
                {bank.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">Alle Wörter eingesetzt – jetzt überprüfen!</span>
                ) : (
                  bank.map(word => (
                    <button
                      key={word.id}
                      draggable
                      onDragStart={(e) => onDragStartWord(e, word.id)}
                      onClick={() => onWordClick(word.id)}
                      className={`px-2 py-0.5 rounded-md text-[12px] font-medium border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm ${
                        selectedWordId === word.id
                          ? 'bg-blue-600 text-white border-blue-700 shadow'
                          : 'bg-white text-slate-800 border-blue-300 hover:border-blue-500'
                      }`}
                    >
                      {word.text}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Text mit Lücken — nimmt verbleibenden Platz */}
            <div className="flex-1 min-h-0 overflow-auto px-4 py-3 leading-[1.8] text-[14px] text-slate-800">
              {tokens.map((tok, i) => {
                if (tok.type === 'text') {
                  return <span key={i} className="whitespace-pre-wrap">{tok.value}</span>;
                }
                const word = assignments[tok.slotId];
                const correct = correctnessMap[tok.slotId];
                const showFeedback = checked && word;

                let stateClass = 'border-slate-400 bg-slate-50 text-slate-400';
                if (word && !checked) {
                  stateClass = 'border-blue-500 bg-blue-100 text-blue-900 shadow-sm';
                } else if (showFeedback && correct === true) {
                  stateClass = 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-sm';
                } else if (showFeedback && correct === false) {
                  stateClass = 'border-red-500 bg-red-100 text-red-900 shadow-sm';
                }

                return (
                  <span
                    key={i}
                    onDrop={(e) => onDropSlot(e, tok.slotId)}
                    onDragOver={onDragOver}
                    onClick={() => onSlotClick(tok.slotId)}
                    className={`inline-flex items-center justify-center gap-0.5 mx-0.5 px-2 py-0 min-w-[72px] rounded border border-dashed text-[13px] font-semibold cursor-pointer transition-all ${stateClass}`}
                  >
                    {word ? (
                      <>
                        <span>{word.text}</span>
                        {showFeedback && correct === true && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {showFeedback && correct === false && <XCircle className="w-3 h-3 text-red-600" />}
                      </>
                    ) : (
                      <span className="text-[10px] opacity-50">______</span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Feedback-Banner — kompakt */}
            {checked && (
              <div className={`px-3 py-1.5 border-t text-xs font-medium flex items-center gap-2 shrink-0 ${
                allCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {allCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Super! Alle {slots.length} Lücken richtig ausgefüllt. 🎉
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    {correctCount} von {slots.length} richtig. Versuche es nochmal!
                  </>
                )}
              </div>
            )}

            {/* Action-Leiste — kompakt */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-slate-600 h-7 text-xs">
                <RotateCcw className="w-3 h-3" />
                Zurücksetzen
              </Button>
              <Button
                size="sm"
                onClick={handleCheck}
                disabled={!allFilled}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Überprüfen
              </Button>
            </div>
          </article>

          {slots.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-6">
              Diese Aufgabe enthält noch keine Lücken.
            </p>
          )}
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}