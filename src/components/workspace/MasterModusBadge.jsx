/**
 * MasterModusBadge.jsx
 *
 * Reines Anzeige-Badge: signalisiert in jeder Master-Aufgaben-Karte, in
 * welchem Anzeige-Modus die übergeordnete Aktivität läuft.
 *   - 'shuffle' → Schüler bekommt zufällig eine der Aufgaben (Variantentraining)
 *   - 'alle'    → alle Aufgaben sind sichtbar / werden bearbeitet
 *
 * Keine Logik, keine Klicks. Die Haupteinstellung liegt auf Aktivitäts-Ebene
 * (MasterAnzeigeModusToggle). Wird nur bei ≥2 Master-Aufgaben angezeigt.
 */

import React from 'react';
import { Shuffle, ListChecks } from 'lucide-react';

export default function MasterModusBadge({ modus }) {
  const isShuffle = modus !== 'alle';
  const Icon = isShuffle ? Shuffle : ListChecks;
  return (
    <span
      className={
        isShuffle
          ? 'inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full'
          : 'inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full'
      }
      title={
        isShuffle
          ? 'Diese Aufgabe läuft im Shuffle-Modus: Schüler erhalten zufällig eine der Varianten.'
          : 'Diese Aufgabe läuft im Modus „Alle bearbeiten": alle Varianten sind sichtbar.'
      }
    >
      <Icon className="w-3 h-3" />
      {isShuffle ? 'Shuffle' : 'Alle bearbeiten'}
    </span>
  );
}