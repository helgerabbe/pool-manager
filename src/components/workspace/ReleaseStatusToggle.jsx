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
      {/* Hauptelement: Toggle-Karte mit weichem Schatten */}
      <button
        type="button"
        onClick={() => onToggle(!isReleased)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all duration-300 shadow-sm cursor-pointer group',
          isReleased
            ? 'bg-green-50 border-green-400 shadow-green-100'
            : 'bg-slate-50 border-slate-300 shadow-slate-100',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Icon-Container */}
        <div className={cn(
          'shrink-0 p-3 rounded-full transition-all duration-300',
          isReleased
            ? 'bg-green-200 text-green-700'
            : 'bg-slate-200 text-slate-600'
        )}>
          {isReleased
            ? <CheckCircle2 className="w-6 h-6" />
            : <Clock className="w-6 h-6" />
          }
        </div>

        {/* Text-Bereich */}
        <div className="flex-1 text-left">
          <p className={cn(
            'text-sm font-semibold transition-colors duration-300',
            isReleased ? 'text-green-800' : 'text-slate-700'
          )}>
            {isReleased ? 'Freigegeben' : 'Entwurf'}
          </p>
          <p className={cn(
            'text-xs transition-colors duration-300',
            isReleased ? 'text-green-700/80' : 'text-slate-600'
          )}>
            {isReleased
              ? 'Ist für den Export nach Moodle freigegeben'
              : 'Noch nicht für Export freigegeben'}
          </p>
        </div>

        {/* Toggle-Switch (rechts) */}
        <div className={cn(
          'shrink-0 h-8 w-14 rounded-full transition-all duration-300 flex items-center p-1',
          isReleased
            ? 'bg-green-500'
            : 'bg-slate-400'
        )}>
          <div className={cn(
            'h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 transform',
            isReleased ? 'translate-x-6' : 'translate-x-0'
          )} />
        </div>
      </button>

      {/* Helper-Text (unten) */}
      <p className={cn(
        'text-[11px] mt-2.5 px-1 transition-colors duration-300',
        isReleased
          ? 'text-green-700 font-medium'
          : 'text-slate-600'
      )}>
        {isReleased
          ? '✓ Export-Status: Freigegeben für Moodle'
          : '○ Export-Status: Noch nicht freigegeben'}
      </p>
    </div>
  );
}