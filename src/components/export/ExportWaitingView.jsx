/**
 * ExportWaitingView.jsx
 * 
 * Alternative Ansicht für Ebene 5 (Export-Cockpit) während eines laufenden Exports.
 * Zeigt nur die gerade in Übertragung befindlichen Elemente an.
 */

import React from 'react';
import { Loader2, Zap } from 'lucide-react';

export function ExportWaitingView({ pendingElements }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          <Zap className="w-6 h-6 inline text-yellow-500 mr-2" />
          🚀 Export in Bearbeitung
        </h2>
        <p className="text-sm text-muted-foreground">
          {pendingElements.length} Element{pendingElements.length !== 1 ? 'e' : ''} werden gerade nach 
          Moodle übertragen. Bitte warten Sie, bis der Prozess abgeschlossen ist.
        </p>
      </div>

      {/* Pending Elements Liste */}
      <div className="space-y-2">
        {pendingElements.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-3 animate-pulse"
          >
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">
                {item.titel_des_pakets || item.phase || 'Element'}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Status: 🔒 gesperrt (pending)
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Status Info */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs text-slate-600 text-center">
          ↻ Aktualisiert automatisch alle 3 Sekunden…
        </p>
        <p className="text-xs text-slate-500 text-center mt-2">
          Der Export-Abschluss wird vom Admin-Team bestätigt.
        </p>
      </div>
    </div>
  );
}