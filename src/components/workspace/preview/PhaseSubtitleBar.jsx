/**
 * PhaseSubtitleBar.jsx
 *
 * Schlanke Phasen-Kopfleiste für die Schüler-Vorschau im 960×600-Slot.
 * Sitzt oben in der Slide und ersetzt den großflächigen PhaseBadge,
 * weil dort jeder Pixel zählt.
 */
import React from 'react';

const CONFIG = {
  'Input':     { label: 'Input',     subtitle: 'Hier erklären wir dir, was du wissen und können sollst.', bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-900' },
  'Übung':     { label: 'Übung',     subtitle: 'Hier übst du, was du gelernt hast.',                       bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800' },
  'Abschluss': { label: 'Abschluss', subtitle: 'Hier zeigst du, was du kannst.',                           bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
};

export default function PhaseSubtitleBar({ phase }) {
  const c = CONFIG[phase];
  if (!c) return null;
  return (
    <div className={`px-4 py-1.5 ${c.bg} border-b ${c.border} text-[12px] ${c.text} shrink-0`}>
      <span className="font-semibold">{c.label} ·</span> {c.subtitle}
    </div>
  );
}