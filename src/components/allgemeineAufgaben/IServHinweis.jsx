/**
 * IServHinweis
 *
 * Rückmeldung der MBK (2026-09-03): Arbeitsblätter wurden mehrfach als
 * IServ-Link eingetragen. Schüler kommen an IServ-Ordner von Lehrkräften
 * nicht heran – die Aufgabe ist dann für sie nicht bearbeitbar.
 */

import React from 'react';
import { Info } from 'lucide-react';

export default function IServHinweis() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        Arbeitsblätter bitte hier als Material hochladen, nicht als IServ-Link eintragen.
        Schüler kommen an IServ-Ordner von Lehrkräften nicht heran.
      </span>
    </p>
  );
}