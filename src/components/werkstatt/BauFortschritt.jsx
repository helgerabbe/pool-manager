import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * BauFortschritt
 * ──────────────
 * Kleine Zeile unter der gestreamten Antwort, solange die KI im Hintergrund
 * den eigentlichen Inhalt (Code bzw. Foliensatz) schreibt. Ohne sie wirkte
 * die Werkstatt minutenlang eingefroren, obwohl gebaut wurde.
 *
 * Props: fortschritt { zeichen, sekunden } | null, was = 'die Aufgabe'
 */
export default function BauFortschritt({ fortschritt, was = 'die Aufgabe' }) {
  if (!fortschritt) return null;
  const zeichen = Number(fortschritt.zeichen || 0).toLocaleString('de-DE');
  const sek = Number(fortschritt.sekunden || 0);
  const zeit = sek >= 60 ? `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')} min` : `${sek} s`;
  return (
    <p className="mt-1.5 inline-flex items-center gap-2 text-xs text-slate-500">
      <Loader2 className="w-3 h-3 animate-spin" />
      baut {was} … {zeichen} Zeichen, {zeit}
    </p>
  );
}