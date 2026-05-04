/**
 * ActiveLocksList.jsx
 *
 * Zeigt eine Liste der aktuell aktiven Bearbeitungs-Locks einer Einheit
 * (aus preflightFinalRelease bzw. der 409-Antwort von
 * setEinheitFreigabeStatus). Wird im Confirm-Dialog der finalen Freigabe
 * eingeblendet, wenn Pre-Flight fehlschlägt.
 *
 * Erwartet ein Array `locks` mit Einträgen:
 *   { scope, id, titel, user_email, locked_at }
 */

import React from 'react';
import { FileText, Package, FlaskConical, Wrench } from 'lucide-react';

const SCOPE_META = {
  aufgabe: { label: 'Aufgabe', Icon: FileText },
  lernpaket: { label: 'Lernpaket', Icon: Package },
  master_aufgabe: { label: 'Master-Aufgabe', Icon: FlaskConical },
  structural: { label: 'Strukturbearbeitung', Icon: Wrench },
};

function formatRelative(isoDate) {
  if (!isoDate) return '';
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const h = Math.floor(diffMin / 60);
  return `vor ${h} Std.`;
}

export default function ActiveLocksList({ locks = [] }) {
  if (!locks || locks.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
      <p className="text-xs font-semibold text-amber-900 mb-1.5">
        Aktuell bearbeitet ({locks.length}):
      </p>
      <ul className="space-y-1.5">
        {locks.map((l) => {
          const meta = SCOPE_META[l.scope] || { label: l.scope, Icon: FileText };
          const Icon = meta.Icon;
          return (
            <li
              key={`${l.scope}:${l.id}`}
              className="flex items-start gap-2 text-[12px] text-amber-950 leading-snug"
            >
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" />
              <div className="min-w-0">
                <div>
                  <span className="font-medium">{meta.label}:</span>{' '}
                  <span className="truncate">{l.titel}</span>
                </div>
                <div className="text-amber-800/80 text-[11px]">
                  durch <strong>{l.user_email}</strong>
                  {l.locked_at ? ` · ${formatRelative(l.locked_at)}` : ''}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}