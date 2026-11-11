import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Warnzeichen im Menübaum: Hier ist Nacharbeit vorgemerkt (Notiz beim Darüberfahren). */
export default function NacharbeitZeichen({ notiz = '', gewaehlt = false }) {
  return (
    <span title={notiz?.trim() ? `Nacharbeit: ${notiz}` : 'Für Nacharbeit vorgemerkt'} className="shrink-0">
      <AlertTriangle className={cn('w-3.5 h-3.5', gewaehlt ? 'text-amber-300' : 'text-amber-500')} />
    </span>
  );
}