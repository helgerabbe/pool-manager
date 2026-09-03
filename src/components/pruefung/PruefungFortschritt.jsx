/**
 * PruefungFortschritt — Fortschrittsbalken des laufenden Prüflaufs.
 * Zeigt den aktuellen Schritt im Klartext, damit die Wartezeit nachvollziehbar
 * bleibt (die Prüfung geht Lernpaket für Lernpaket durch).
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PruefungFortschritt({ fortschritt }) {
  if (!fortschritt) return null;
  const { erledigt = 0, gesamt = 1, schritt = '' } = fortschritt;
  const prozent = Math.min(100, Math.round((erledigt / Math.max(1, gesamt)) * 100));

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
        <Loader2 className="w-4 h-4 animate-spin" />
        Prüfung läuft … {erledigt} von {gesamt}
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-blue-100 overflow-hidden">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${prozent}%` }} />
      </div>
      <p className="mt-2 text-xs text-blue-800 truncate">{schritt}</p>
    </div>
  );
}