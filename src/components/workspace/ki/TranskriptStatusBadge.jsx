/**
 * TranskriptStatusBadge.jsx
 *
 * AP2 / MBK-Integration §1.4 — Kompakter Status-Indikator für Medien-
 * Aktivitäten (Video, Audio, Podcast, Hörverstehen) in der Read-Only-
 * Inhaltsansicht. Zeigt der Lehrkraft auf einen Blick, ob ein Transkript
 * für die KI-Aufgabengenerierung bereits hinterlegt wurde.
 *
 * Drei Zustände:
 *   - „vorhanden"  → grün, ✓-Icon, Zeichenzahl
 *   - „leer"       → amber, ⚠-Icon, klare Handlungsaufforderung
 *
 * Bewusst dumb-component: keine Edit-Funktionalität, nur Anzeige.
 */

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TranskriptStatusBadge({ transkript = '' }) {
  const len = (transkript || '').trim().length;
  const vorhanden = len > 0;

  if (vorhanden) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-green-900">Transkript vorhanden</p>
          <p className="text-[11px] text-green-800/80 mt-0.5">
            {len.toLocaleString('de-DE')} Zeichen — Basis für KI-Fragegenerierung.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber-900">Transkript fehlt</p>
        <p className="text-[11px] text-amber-800/80 mt-0.5">
          Ohne Transkript kann die KI keine Fragen oder Lückentexte zu diesem Medium erzeugen.
          Bitte über „Inhalt bearbeiten" ergänzen.
        </p>
      </div>
    </div>
  );
}