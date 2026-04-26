/**
 * ExportEmptyState.jsx
 *
 * Hinweis-Banner, wenn weder Einheiten noch Basismodule für den Moodle-
 * Export bereitstehen.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ExportEmptyState() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800">
        <p className="font-semibold mb-1">Keine exportierbaren Elemente</p>
        <p className="text-xs">
          Es gibt keine Einheiten oder Basismodule mit Status
          „Freigegeben für Moodle" und ausstehenden Änderungen.
        </p>
      </div>
    </div>
  );
}