import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { isStructurallyLocked, getStructuralLockOwner, getRemainingLockTimeMinutes } from '@/lib/structuralLockEnhanced';

/**
 * Info-Banner für Structural Locks
 * Zeigt an wenn ein anderer Nutzer die Struktur gerade bearbeitet
 */
export default function StructuralLockWarning({ einheit, currentUserEmail }) {
  const isLocked = isStructurallyLocked(einheit, currentUserEmail);
  
  if (!isLocked) return null;

  const lockOwner = getStructuralLockOwner(einheit);
  const remainingMinutes = getRemainingLockTimeMinutes(einheit);

  return (
    <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-sm text-amber-900">Struktur wird gerade bearbeitet</p>
        <p className="text-xs text-amber-700 mt-1">
          {lockOwner && `${lockOwner} `}bearbeitet gerade die Struktur dieser Einheit.
          {remainingMinutes > 0 && ` Der Lock läuft in ~${remainingMinutes} Minute${remainingMinutes !== 1 ? 'n' : ''} ab.`}
        </p>
        <p className="text-xs text-amber-600 mt-2">
          ⚠️ Strukturelle Änderungen (Themenfelder, Lernpakete verschieben) sind derzeit nicht möglich.
        </p>
      </div>
    </div>
  );
}