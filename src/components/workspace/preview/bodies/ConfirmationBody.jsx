/**
 * ConfirmationBody.jsx
 *
 * Interaktive Schüler-Vorschau für die Abschluss-Aktivität „Bearbeitung bestätigen".
 * Zeigt den Hinweistext als Selbstbestätigung mit Checkbox + Bestätigen-Button.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ConfirmationBody({ fieldValues = {} }) {
  // Hinweistext kann unter verschiedenen Feldnamen liegen — robust auslesen.
  const statement = useMemo(() => {
    const candidates = [fieldValues.hinweistext, fieldValues.text, fieldValues.inhalt, fieldValues.aufgabentext];
    const found = candidates.find(v => typeof v === 'string' && v.trim());
    if (found) return found.trim();
    const firstString = Object.values(fieldValues).find(v => typeof v === 'string' && v.trim());
    return firstString ? firstString.trim() : 'Ich habe mich mit den Inhalten des Lernpakets beschäftigt und sie verstanden.';
  }, [fieldValues]);

  const [checked, setChecked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (confirmed && !celebratedRef.current) {
      celebratedRef.current = true;
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  }, [confirmed]);

  const handleReset = () => {
    setChecked(false);
    setConfirmed(false);
    celebratedRef.current = false;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-6 gap-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
      </div>

      {confirmed ? (
        <div className="space-y-3 max-w-md">
          <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-lg">
            <Trophy className="w-5 h-5" /> Bestätigt!
          </div>
          <p className="text-[14px] text-slate-600">{statement}</p>
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5 mt-2">
            <RotateCcw className="w-3.5 h-3.5" /> Nochmal ansehen
          </Button>
        </div>
      ) : (
        <div className="space-y-5 max-w-md w-full">
          <button
            type="button"
            onClick={() => setChecked(c => !c)}
            className={[
              'w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-all',
              checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300',
            ].join(' ')}
          >
            <span className={[
              'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
              checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white',
            ].join(' ')}>
              {checked && <CheckCircle2 className="w-4 h-4" />}
            </span>
            <span className="text-[14px] text-slate-800 leading-relaxed">{statement}</span>
          </button>

          <Button
            onClick={() => setConfirmed(true)}
            disabled={!checked}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4" /> Bestätigen
          </Button>
        </div>
      )}
    </div>
  );
}