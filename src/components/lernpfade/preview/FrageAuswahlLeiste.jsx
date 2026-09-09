/**
 * FrageAuswahlLeiste.jsx
 *
 * Kleine Auswahlzeile über einer generierten Onboarding-Frage: Die Lehrkraft
 * entscheidet damit, ob die Frage übernommen wird, oder wirft sie ganz weg.
 * Bewusst nur Lehrer-Werkzeug — im Schülerbereich taucht sie nicht auf.
 */
import React from 'react';
import { Check, Trash2 } from 'lucide-react';

export default function FrageAuswahlLeiste({ gewaehlt, onToggle, onLoeschen, farbe = 'violet' }) {
  const aktiv = farbe === 'rose'
    ? 'border-rose-300 bg-rose-50 text-rose-700'
    : 'border-violet-300 bg-violet-50 text-violet-700';

  return (
    <div className="mb-3 flex items-center gap-2 border-b border-dashed border-slate-200 pb-2">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          gewaehlt ? aktiv : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
        }`}
      >
        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${gewaehlt ? 'border-current bg-current' : 'border-slate-300'}`}>
          {gewaehlt && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
        {gewaehlt ? 'Wird übernommen' : 'Nicht übernehmen'}
      </button>
      <button
        type="button"
        onClick={onLoeschen}
        title="Frage verwerfen"
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Verwerfen
      </button>
    </div>
  );
}