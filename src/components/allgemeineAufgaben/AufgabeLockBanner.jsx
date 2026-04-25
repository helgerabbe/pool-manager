/**
 * AufgabeLockBanner.jsx
 *
 * Prominentes Warn-Banner im Aufgaben-Editor (Tab 5), wenn die Aufgabe durch
 * einen oder mehrere freigegebene Lernpfade gesperrt ist.
 *
 * Quelle: useAufgabeLock(aufgabeId) → { locked, by_pfade }
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { formatLerntypList } from '@/lib/lernpfadLockUtils';

export default function AufgabeLockBanner({ byPfade = [] }) {
  if (!byPfade || byPfade.length === 0) return null;

  const liste = formatLerntypList(byPfade);
  const ist = byPfade.length === 1 ? 'den Pfad' : 'die Pfade';

  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 flex items-start gap-3"
    >
      <Lock className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
      <div className="text-sm text-orange-900 leading-snug">
        <p className="font-semibold">Diese Aufgabe ist gesperrt durch {ist}: {liste}.</p>
        <p className="mt-1 text-xs text-orange-800">
          Bitte den Pfad zuerst im Dashboard (Tab „Dashboards") entsperren, um Änderungen vorzunehmen.
        </p>
      </div>
    </div>
  );
}