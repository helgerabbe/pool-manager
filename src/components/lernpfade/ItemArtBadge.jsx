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
import { getAcceptedTypeForAufgabe } from '@/lib/lernpfadeUtils';

const ART_META = {
  lernpaket: {
    label: 'Lernpaket',
    cls: 'bg-violet-100 text-violet-800 border-violet-300',
    title:
      'Lernpaket — ein Paket aus mehreren Aktivitäten. Passt nur in ein Lernpaketebündel.',
  },
  projekt: {
    label: 'Projekt',
    cls: 'bg-rose-100 text-rose-800 border-rose-300',
    title: 'Projektaufgabe (Ebene 3). Passt nur in ein Projektbündel.',
  },
  aufgabe: {
    label: 'Aufgabe',
    cls: 'bg-sky-100 text-sky-800 border-sky-300',
    title: 'Einzelne Aufgabe (Ebene 1/2). Passt nur in ein Aufgabenbündel.',
  },
};

export default function ItemArtBadge({ aufgabe }) {
  if (!aufgabe) return null;
  const accepted = getAcceptedTypeForAufgabe(aufgabe);
  const meta =
    accepted === 'lernpaket'
      ? ART_META.lernpaket
      : accepted === 'projekt'
      ? ART_META.projekt
      : ART_META.aufgabe;

  return (
    <span
      className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${meta.cls}`}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}