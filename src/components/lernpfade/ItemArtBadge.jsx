/**
 * ItemArtBadge.jsx
 *
 * Kleine Kennzeichnung der ART eines Pfad-Elements: Lernpaket, Aufgabe oder
 * Projekt. Damit ist auf der obersten Sektor-Ebene sofort erkennbar, was für
 * ein Element dort liegt — und damit auch, in welches Bündel es überhaupt
 * hineinpasst (Lernpakete → Lernpaketebündel, Aufgaben → Aufgabenbündel,
 * Projekte → Projektbündel).
 *
 * Die Klassifizierung nutzt bewusst dieselbe Funktion wie der Drop-Validator
 * (`getAcceptedTypeForAufgabe`), damit Anzeige und Drop-Regel nie auseinander
 * laufen können.
 */

import React from 'react';
import { getElementArt, ART_FARBEN } from '@/lib/lernpfadFarben';

// Farben kommen zentral aus lernpfadFarben.js (blau = Lernpaket,
// orange = Aufgabe, lila = Projekt) – identisch zu Zeile, Bündel und Badge.
const ART_TITEL = {
  lernpaket:
    'Lernpaket (blau) — ein Paket aus mehreren Aktivitäten. Passt nur in ein Lernpaketebündel.',
  projekt: 'Projektaufgabe (lila, Ebene 3). Passt nur in ein Projektbündel.',
  aufgabe: 'Einzelne Aufgabe (orange, Ebene 1/2). Passt nur in ein Aufgabenbündel.',
};

export default function ItemArtBadge({ aufgabe }) {
  if (!aufgabe) return null;
  const art = getElementArt(aufgabe);
  const farbe = ART_FARBEN[art];

  return (
    <span
      className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${farbe.badge}`}
      title={ART_TITEL[art]}
    >
      {farbe.label}
    </span>
  );
}