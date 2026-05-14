/**
 * ReleaseStatusToggle.jsx
 *
 * Premium-UI-Element für Freigabe-Schalter in Modals
 * - Toggle-Switch mit dynamischen Farben (Grau → Grün)
 * - Sanfte Übergänge (transition-all duration-300)
 * - Klare visuelle Rückmeldung des Status
 * - Wiederverwendbar in allen Bearbeitungs-Modals
 */

import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReleaseStatusToggle({ isReleased, onToggle, disabled = false }) {
  return (
    <div className="w-full">
      {/* Kompakte Toggle-Karte (ca. halbe Höhe ggü. der vorigen Version,
          siehe Feedback 2026-05-14): Icon kleiner, weniger Padding,
          kein zweizeiliger Text mehr. */}
      <button
        type="button"
        onClick={() => onToggle(!isReleased)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 cursor-pointer',
          isReleased
            ? 'bg-green-50 border-green-400'
            : 'bg-slate-50 border-slate-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Icon-Container */}
        <div className={cn(
          'shrink-0 p-1.5 rounded-full transition-all duration-300',
          isReleased
            ? 'bg-green-200 text-green-700'
            : 'bg-slate-200 text-slate-600'
        )}>
          {isReleased
            ? <CheckCircle2 className="w-4 h-4" />
            : <Clock className="w-4 h-4" />
          }
        </div>

        {/* Text-Bereich: einzeilig */}
        <p className={cn(
          'flex-1 text-left text-sm font-semibold transition-colors duration-300',
          isReleased ? 'text-green-800' : 'text-slate-700'
        )}>
          {isReleased ? 'Freigegeben' : 'Entwurf — noch nicht für Export freigegeben'}
        </p>

        {/* Toggle-Switch (rechts) */}
        <div className={cn(
          'shrink-0 h-6 w-11 rounded-full transition-all duration-300 flex items-center p-0.5',
          isReleased ? 'bg-green-500' : 'bg-slate-400'
        )}>
          <div className={cn(
            'h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 transform',
            isReleased ? 'translate-x-5' : 'translate-x-0'
          )} />
        </div>
      </button>
    </div>
  );
}