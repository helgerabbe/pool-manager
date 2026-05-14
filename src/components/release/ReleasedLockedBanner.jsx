/**
 * components/release/ReleasedLockedBanner.jsx
 *
 * Phase 5 des Freigabe-Konzepts (2026-05-14):
 * Read-Only-Banner für ein freigegebenes Objekt. Wird oben im Modal
 * angezeigt und erklärt der Lehrkraft, warum nichts editierbar ist.
 *
 * Bietet (wenn `onUnrelease` gesetzt) einen prominenten Button
 * „Freigabe zurücknehmen".
 */

import React from 'react';
import { Lock, Loader2 } from 'lucide-react';

export default function ReleasedLockedBanner({
  reason = 'activity_released',    // 'activity_released' | 'lernpaket_released' | 'einheit_final' | 'aufgabe_released'
  releasedAt = null,
  releasedBy = null,
  onUnrelease = null,
  isUnreleasing = false,
  hardLocked = false,              // Wenn true → keine Rücknahme möglich (z.B. Einheit final)
}) {
  const text = (() => {
    switch (reason) {
      case 'lernpaket_released':
        return 'Übergeordnetes Lernpaket ist freigegeben — Bearbeitung gesperrt';
      case 'einheit_final':
        return 'Einheit ist final freigegeben — Bearbeitung gesperrt';
      case 'aufgabe_released':
        return 'Diese Aufgabe ist freigegeben und gesperrt';
      case 'activity_released':
      default:
        return 'Diese Aktivität ist freigegeben und gesperrt';
    }
  })();

  return (
    <div className="px-6 py-4 bg-green-50 border-b border-green-200 flex items-start gap-3">
      <Lock className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-800">{text}</p>
        {releasedAt && (
          <p className="text-xs text-green-700 mt-0.5">
            Freigegeben am{' '}
            {new Date(releasedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
            {releasedBy && <> · {releasedBy}</>}
          </p>
        )}
      </div>
      {onUnrelease && !hardLocked && (
        <button
          type="button"
          onClick={onUnrelease}
          disabled={isUnreleasing}
          className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md border border-green-400 bg-white text-green-800 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isUnreleasing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Freigabe zurücknehmen
        </button>
      )}
    </div>
  );
}