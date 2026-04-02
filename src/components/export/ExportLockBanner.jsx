/**
 * ExportLockBanner.jsx
 * 
 * Banner, das angezeigt wird, wenn die Einheit für den Moodle-Export gesperrt ist.
 */

import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

export function ExportLockBanner({ pendingCount }) {
  return (
    <div className="bg-blue-50 border-l-4 border-l-blue-500 rounded-lg p-4 flex items-start gap-3">
      <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-blue-900">🔒 Einheit für Export gesperrt</p>
        <p className="text-sm text-blue-800 mt-1">
          {pendingCount} Element{pendingCount !== 1 ? 'e' : ''} wird/werden gerade nach Moodle übertragen. 
          Änderungen sind erst nach Abschluss des Exports wieder möglich.
        </p>
      </div>
    </div>
  );
}