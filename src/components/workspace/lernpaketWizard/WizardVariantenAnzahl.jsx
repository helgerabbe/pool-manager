/**
 * WizardVariantenAnzahl.jsx
 * Lernpaket-Wizard: Bei masterfähigen Aufgabenformaten (Miniquiz, Test,
 * Begriffe zuordnen …) legt die KI Master-Aufgaben an. Hier wählt die
 * Lehrkraft, wie viele inhaltlich verschiedene Varianten erzeugt werden.
 */
import React from 'react';
import { Layers } from 'lucide-react';

export default function WizardVariantenAnzahl({ value, onChange, disabled }) {
  return (
    <div
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      <Layers className="w-3 h-3" />
      <span>Varianten:</span>
      <input
        type="number"
        min={1}
        max={8}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.min(8, Math.max(1, Math.round(Number(e.target.value) || 1))))}
        className="w-12 h-6 rounded border border-input bg-background px-1.5 text-[11px] text-foreground disabled:opacity-50"
      />
      <span>Master-Aufgabe{value !== 1 ? 'n' : ''}</span>
    </div>
  );
}