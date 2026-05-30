/**
 * TestPreviewModal.jsx
 *
 * Schüler-Vorschau für die Abschluss-Aktivität "Test" im iPad-Frame (960×600-Slot).
 * Tests dürfen scrollen — Schüler:innen sollen alle Fragen beantworten können.
 * Unterstützt Fragetypen: single-/multiple-choice, true_false, solution_word/text.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, RotateCcw, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import IPadFrame from '@/components/workspace/preview/IPadFrame';

function PhaseSubtitleBar() {
  return (
    <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 text-[12px] text-emerald-800 shrink-0">
      <span className="font-semibold">Abschluss ·</span> Hier zeigst du, was du kannst.
    </div>
  );
}

function normalizeAnswers(q) {
  return Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
}
function isCorrectFlag(a) {
  return a?.isCorrect === true || a?.correct === true;
}

function QuestionBlock({ q, index, value, onChange, checked }) {
  const type = q.type;
  const answers = normalizeAnswers(q);
  const correctCount = answers.filter(isCorrectFlag).length;
  const isMulti = type !== 'true_false' && type !== 'solution_word' && type !== 'text' && correctCount > 1;

  // Korrektheit ermitteln
  let correct = null;
  if (checked) {
    if (type === 'true_false') {
      correct = value === q.correctAnswer;
    } else if (type === 'solution_word' || type === 'text') {
      correct = String(value || '').trim().toLowerCase() === String(q.expectedAnswer || '').trim().toLowerCase();
    } else if (isMulti) {
      const correctSet = new Set(answers.map((a, i) => isCorrectFlag(a) ? i : null).filter(i => i !== null));
      const valSet = new Set(Array.isArray(value) ? value : []);
      correct = correctSet.size === valSet.size && [...correctSet].every(i => valSet.has(i));
    } else {
      correct = typeof value === 'number' && answers[value] && isCorrectFlag(answers[value]);
    }
  }

  return (
    <div className={`rounded-lg border p-3 ${
      checked
        ? correct ? 'border-emerald-300 bg-emerald-50/50' : 'border-red-300 bg-red-50/50'
        : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm font-bold text-slate-700 shrink-0">{index + 1}.</span>
        <p className="text-sm font-medium text-slate-900 flex-1">{q.question}</p>
        {checked && (correct
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          : <XCircle className="w-5 h-5 text-red-600 shrink-0" />)}
      </div>

      <div className="pl-6 space-y-1.5">
        {type === 'true_false' && (
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button
                key={String(v)}
                disabled={checked}
                onClick={() => onChange(v)}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  value === v
                    ? 'border-blue-500 bg-blue-100 text-blue-900'
                    : 'border-slate-300 bg-white hover:border-blue-300'
                } ${checked ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                {v ? 'Richtig' : 'Falsch'}
              </button>
            ))}
          </div>
        )}

        {(type === 'solution_word' || type === 'text') && (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={checked}
            placeholder="Antwort eingeben…"
            className="h-8 text-sm"
          />
        )}

        {type !== 'true_false' && type !== 'solution_word' && type !== 'text' && answers.length > 0 && (
          answers.map((a, ai) => {
            const isChosen = isMulti
              ? Array.isArray(value) && value.includes(ai)
              : value === ai;
            const showAsCorrect = checked && isCorrectFlag(a);
            const showAsWrong = checked && isChosen && !isCorrectFlag(a);
            return (
              <label
                key={ai}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                  showAsCorrect ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                  : showAsWrong ? 'border-red-400 bg-red-100 text-red-900'
                  : isChosen ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white hover:border-blue-300'
                } ${checked ? 'cursor-not-allowed' : ''}`}
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`q-${q.id || index}`}
                  checked={isChosen}
                  disabled={checked}
                  onChange={() => {
                    if (isMulti) {
                      const arr = Array.isArray(value) ? [...value] : [];
                      const idx = arr.indexOf(ai);
                      if (idx >= 0) arr.splice(idx, 1); else arr.push(ai);
                      onChange(arr);
                    } else {
                      onChange(ai);
                    }
                  }}
                  className="shrink-0"
                />
                <span className="flex-1">{a.text}</span>
                {showAsCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TestPreviewModal({ open, onOpenChange, fieldValues = {}, catalogName = 'Test', phase = 'Abschluss' }) {
  const questions = useMemo(() => Array.isArray(fieldValues.questions) ? fieldValues.questions : [], [fieldValues.questions]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) { setAnswers({}); setChecked(false); }
  }, [open]);

  const allAnswered = questions.length > 0 && questions.every((q, i) => {
    const v = answers[i];
    if (q.type === 'true_false') return typeof v === 'boolean';
    if (q.type === 'solution_word' || q.type === 'text') return String(v || '').trim() !== '';
    const ans = normalizeAnswers(q);
    const isMulti = ans.filter(isCorrectFlag).length > 1;
    return isMulti ? Array.isArray(v) && v.length > 0 : typeof v === 'number';
  });

  const score = useMemo(() => {
    if (!checked) return 0;
    let s = 0;
    questions.forEach((q, i) => {
      const v = answers[i];
      const ans = normalizeAnswers(q);
      if (q.type === 'true_false') { if (v === q.correctAnswer) s++; }
      else if (q.type === 'solution_word' || q.type === 'text') {
        if (String(v || '').trim().toLowerCase() === String(q.expectedAnswer || '').trim().toLowerCase()) s++;
      } else {
        const correctSet = new Set(ans.map((a, idx) => isCorrectFlag(a) ? idx : null).filter(idx => idx !== null));
        const isMulti = correctSet.size > 1;
        if (isMulti) {
          const valSet = new Set(Array.isArray(v) ? v : []);
          if (correctSet.size === valSet.size && [...correctSet].every(idx => valSet.has(idx))) s++;
        } else {
          if (typeof v === 'number' && correctSet.has(v)) s++;
        }
      }
    });
    return s;
  }, [checked, answers, questions]);

  const handleCheck = () => {
    setChecked(true);
    const s = (() => {
      let total = 0;
      questions.forEach((q, i) => {
        const v = answers[i];
        const ans = normalizeAnswers(q);
        if (q.type === 'true_false') { if (v === q.correctAnswer) total++; }
        else if (q.type === 'solution_word' || q.type === 'text') {
          if (String(v || '').trim().toLowerCase() === String(q.expectedAnswer || '').trim().toLowerCase()) total++;
        } else {
          const correctSet = new Set(ans.map((a, idx) => isCorrectFlag(a) ? idx : null).filter(idx => idx !== null));
          if (correctSet.size > 1) {
            const valSet = new Set(Array.isArray(v) ? v : []);
            if (correctSet.size === valSet.size && [...correctSet].every(idx => valSet.has(idx))) total++;
          } else if (typeof v === 'number' && correctSet.has(v)) total++;
        }
      });
      return total;
    })();
    if (s === questions.length && questions.length > 0) {
      const rect = containerRef.current?.getBoundingClientRect();
      const origin = rect ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 3) / window.innerHeight } : { x: 0.5, y: 0.5 };
      confetti({ particleCount: 140, spread: 90, origin, startVelocity: 45, scalar: 1.1 });
      setTimeout(() => confetti({ particleCount: 80, spread: 130, origin }), 220);
    }
  };

  const handleReset = () => { setAnswers({}); setChecked(false); };
  const allCorrect = checked && score === questions.length && questions.length > 0;

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
            So sieht der Schüler diesen Test auf dem iPad. Tests dürfen scrollen — alle Fragen müssen beantwortet werden.
          </p>
        </DialogHeader>

        <div className="pt-3" ref={containerRef}>
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col">
              <PhaseSubtitleBar />

              {fieldValues.aufgabentext && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[13px] text-blue-900 leading-relaxed shrink-0">
                  {fieldValues.aufgabentext}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                {questions.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-8">Für diesen Test sind noch keine Fragen hinterlegt.</p>
                ) : questions.map((q, i) => (
                  <QuestionBlock
                    key={q.id || i}
                    q={q}
                    index={i}
                    value={answers[i]}
                    onChange={(v) => { setAnswers(a => ({ ...a, [i]: v })); setChecked(false); }}
                    checked={checked}
                  />
                ))}
              </div>

              {checked && questions.length > 0 && (
                <div className={`px-3 py-2 border-t text-xs font-medium flex items-center gap-2 shrink-0 ${
                  allCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {allCorrect
                    ? <><Trophy className="w-5 h-5" /> Perfekt! Alle {questions.length} Fragen richtig. 🎉</>
                    : <><XCircle className="w-5 h-5" /> {score} von {questions.length} richtig.</>}
                </div>
              )}

              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-slate-600 h-7 text-xs">
                  <RotateCcw className="w-3 h-3" /> Zurücksetzen
                </Button>
                <Button
                  size="sm"
                  onClick={handleCheck}
                  disabled={!allAnswered || checked}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Test abgeben
                </Button>
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}