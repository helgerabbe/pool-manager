/**
 * LockBanner.jsx
 *
 * Zeigt einen Warn-Banner wenn eine Aufgabe von einem anderen Nutzer gesperrt ist.
 * Wird in MasterActivityPanel und KlonDetailView verwendet.
 */

import React from 'react';
import { Lock } from 'lucide-react';

export default function LockBanner({ lockedByUser }) {
  if (!lockedByUser) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm mb-4">
      <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">Wird gerade bearbeitet</p>
        <p className="text-xs mt-0.5 text-amber-700">
          <strong>{lockedByUser}</strong> bearbeitet diese Aufgabe gerade. Du kannst den Inhalt lesen, aber nicht bearbeiten.
        </p>
      </div>
    </div>
  );
}