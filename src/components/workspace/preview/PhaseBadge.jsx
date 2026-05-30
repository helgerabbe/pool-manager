/**
 * PhaseBadge.jsx
 *
 * Sichtbarer Phasen-Indikator für die Schüler-Vorschau (Stufe-1-Pilot, 2026-05-30).
 * Zeigt klar, in welcher Phase eines Lernpakets sich der Schüler gerade befindet,
 * in einer schülergerechten "Hier …"-Ansprache.
 */
import React from 'react';
import { BookOpen, Dumbbell, Trophy } from 'lucide-react';

const PHASE_CONFIG = {
  'Input': {
    label: 'Input',
    subtitle: 'Hier erklären wir dir, was du wissen und können sollst.',
    icon: BookOpen,
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  'Übung': {
    label: 'Übung',
    subtitle: 'Hier übst du, was du gelernt hast.',
    icon: Dumbbell,
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
  },
  'Abschluss': {
    label: 'Abschluss',
    subtitle: 'Hier zeigst du, was du kannst.',
    icon: Trophy,
    bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
  },
};

export default function PhaseBadge({ phase }) {
  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-xl overflow-hidden border border-white/30 shadow-sm ${config.bg}`}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <div className="bg-white/20 backdrop-blur rounded-lg p-2">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
        <div className="text-base font-bold leading-tight">{config.label}</div>
        <div className="text-sm font-normal opacity-90 leading-snug">{config.subtitle}</div>
        </div>
      </div>
    </div>
  );
}