/**
 * AufgabeLockBanner.jsx
 *
 * Prominentes Warn-Banner im Aufgaben-Editor (Tab 5), wenn die Inhalts-Sperre
 * der Aufgabe greift.
 *
 * Schritt 3 des Freigabe-Workflows: Die Sperre kommt jetzt von der finalen
 * Einheits-Freigabe (`einheit_freigabe_status === 'final_freigegeben'`),
 * nicht mehr von einzelnen Lernpfaden. Das Banner-Prop `byPfade` bleibt aus
 * Kompatibilitätsgründen erhalten, wird aktuell aber nicht mehr genutzt.
 *
 * Quelle: useAufgabeLock(aufgabeId) → { locked, by_pfade }
 */

import React from 'react';
import { Lock } from 'lucide-react';

export default function AufgabeLockBanner({ byPfade: _byPfade = [] }) {
  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-3"
    >
      <Lock className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
      <div className="text-sm text-orange-900 leading-snug">
        <p className="font-semibold">Diese Einheit ist final freigegeben.</p>
        <p className="mt-1 text-xs text-orange-800">
          Die Inhalte aller Aufgaben dieser Einheit sind gesperrt. Über den Tab „Dashboards"
          → „Freigabe aufheben" lassen sich die Inhalte wieder bearbeiten.
        </p>
      </div>
    </div>
  );
}