/**
 * PhaseBadge.jsx
 *
 * Sichtbarer Phasen-Indikator für die Schüler-Vorschau (Stufe-1-Pilot, 2026-05-30).
 * Zeigt klar, in welcher Phase eines Lernpakets sich der Schüler gerade befindet:
 *   1. Input    — Neues Lernen / Aufnehmen
 *   2. Übung    — Anwenden & Festigen
 *   3. Abschluss — Können beweisen
 *
 * Reine UI-Komponente. Keine Business-Logik.
 */
import React from 'react';
import { BookOpen, Dumbbell, Trophy } from 'lucide-react';

const PHASE_CONFIG = {
  'Input': {
    step: 1,
    label: 'Input',
    subtitle: 'Neues Lernen & Aufnehmen',
    icon: BookOpen,
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    soft: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    dotDone: 'bg-blue-300',
    dotTodo: 'bg-slate-200',
  },
  'Übung': {
    step: 2,
    label: 'Übung',
    subtitle: 'Anwenden & Festigen',
    icon: Dumbbell,
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    soft: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    dotDone: 'bg-amber-300',
    dotTodo: 'bg-slate-200',
  },
  'Abschluss': {
    step: 3,
    label: 'Abschluss',
    subtitle: 'Können beweisen',
    icon: Trophy,
    bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
    soft: 'bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    dotDone: 'bg-emerald-300',
    dotTodo: 'bg-slate-200',
  },
};

export default function PhaseBadge({ phase }) {
  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  const Icon = config.icon;
  const currentStep = config.step;

  return (
    <div className={`rounded-xl overflow-hidden border border-white/30 shadow-sm ${config.bg}`}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <div className="bg-white/20 backdrop-blur rounded-lg p-2">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              Phase {currentStep} von 3
            </span>
          </div>
          <div className="text-base font-bold leading-tight">
            {config.label}
            <span className="font-normal opacity-90 ml-2 text-sm">· {config.subtitle}</span>
          </div>
        </div>
        {/* Mini-Stepper */}
        <div className="hidden sm:flex items-center gap-1.5">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 w-6 rounded-full transition-all ${
                step === currentStep
                  ? 'bg-white'
                  : step < currentStep
                    ? 'bg-white/60'
                    : 'bg-white/25'
              }`}
              title={`Phase ${step}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}