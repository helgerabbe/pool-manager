import React from 'react';
import { Link2Off } from 'lucide-react';

/**
 * Hinweisseite für Moodle-Schüler, wenn die "Externes Tool"-Aktivität
 * noch keine Einheit verknüpft hat (kein einheit=-Parameter).
 * Moodle-Schüler sehen bewusst NUR die verknüpfte Einheit — ohne Einheit
 * gibt es also nichts anzuzeigen.
 */
export default function MoodleKeineEinheit() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center space-y-4">
        <Link2Off className="mx-auto h-12 w-12 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Keine Lerneinheit verknüpft</h1>
        <p className="text-sm text-slate-600">
          Diese Moodle-Aktivität ist noch mit keiner Lerneinheit verbunden.
          Bitte sag deiner Lehrkraft Bescheid.
        </p>
        <div className="rounded-lg bg-slate-50 border px-4 py-3 text-left text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Hinweis für Lehrkräfte:</span>{' '}
          In der Moodle-Aktivität unter „Benutzerdefinierte Parameter" die Zeile{' '}
          <code className="bg-white border rounded px-1">einheit=EINHEIT-ID</code>{' '}
          eintragen. Die ID steht in der Adresszeile, wenn die Einheit im
          PoolManager geöffnet ist.
        </div>
      </div>
    </div>
  );
}