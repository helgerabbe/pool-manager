/**
 * SyncWarningBanner.jsx
 * 
 * Zeigt einen Warn-Banner an, wenn eine Einheit nach dem letzten Export
 * erneut bearbeitet wurde. Bedingung: updated_date > last_exported_at
 */

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { formatExportDate } from '@/lib/statusLogic';

export default function SyncWarningBanner({ item, isBasismodul = false }) {
  // Bedingung: updated_date > last_exported_at UND last_exported_at ist nicht null
  if (!item?.last_exported_at || !item?.updated_date) {
    return null;
  }

  const lastExportedDate = new Date(item.last_exported_at);
  const lastUpdatedDate = new Date(item.updated_date);

  // Nur anzeigen wenn nach Export erneut geändert
  if (lastUpdatedDate <= lastExportedDate) {
    return null;
  }

  const formattedDate = formatExportDate(item.last_exported_at);

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-amber-300 bg-amber-50 text-sm text-amber-900">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-1">Achtung: Veraltete Export-Daten</p>
        <p className="text-xs text-amber-800">
          Diese {isBasismodul ? 'Modul' : 'Einheit'} wurde nach dem letzten Export am{' '}
          <strong>{formattedDate}</strong> erneut bearbeitet. Die zuletzt exportierte Datei
          ist veraltet und enthält nicht die aktuellen Änderungen.
        </p>
        <p className="text-xs text-amber-800 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Zuletzt geändert: {formatExportDate(item.updated_date)}
        </p>
      </div>
    </div>
  );
}