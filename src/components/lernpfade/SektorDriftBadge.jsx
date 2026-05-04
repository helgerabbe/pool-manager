/**
 * SektorDriftBadge.jsx
 *
 * Phase E.4 — Visueller Indikator für den Drift-Status eines Sektors
 * im Lernpfad-Architekt (Tab 7).
 *
 * Statuswerte (Quelle: getLernpfadDriftReport / syncLernpfadMembership):
 *   - 'drifted'      → orange Badge „Geändert seit Freigabe"
 *   - 'clean'        → kein Badge (visuelles Rauschen vermeiden)
 *   - 'never_locked' → kein Badge (Standardzustand während der Erstellung)
 *   - 'loading'      → dezenter pulsierender Punkt, solange der Report lädt
 *   - 'unknown'      → kein Badge (Fallback, falls Report fehlschlug)
 *
 * Bewusst klein gehalten — gehört in den Sektor-Header neben das Typ-Label.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function SektorDriftBadge({ status }) {
  if (status === 'loading') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"
        title="Drift-Status wird geladen…"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
      </span>
    );
  }

  if (status === 'drifted') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-orange-50 text-orange-800 border-orange-300"
        title="Dieser Sektor wurde nach der letzten Freigabe verändert. Beim nächsten Lock wird die Signatur aktualisiert."
      >
        <AlertTriangle className="w-3 h-3" />
        Geändert seit Freigabe
      </span>
    );
  }

  // clean / never_locked / unknown → kein Badge
  return null;
}