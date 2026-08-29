import React from 'react';
import { History, Check, Loader2 } from 'lucide-react';

/**
 * StaendeLeiste
 * ─────────────
 * Die gespeicherten Zwischenstände eines offenen Schritts.
 *
 * Anders als die Ständeleiste der alten Werkstatt überlebt diese das
 * Schließen des Fensters — die Stände liegen als eigene Datensätze
 * (AufgabeWerkstattStand), nicht im Sitzungsspeicher.
 *
 * Ist die Aufgabe noch nie gespeichert worden, gibt es keine ID, an der die
 * Stände hängen könnten. Dann sagt die Leiste das offen, statt eine
 * Dauerhaftigkeit vorzutäuschen, die es nicht gibt.
 */
export default function StaendeLeiste({
  staende = [],
  isLoading = false,
  aktiv = true,
  aktuellesFragment = '',
  onLaden,
  disabled = false,
}) {
  if (!aktiv) {
    return (
      <p className="text-[11px] text-slate-500 leading-snug">
        Frühere Stände werden erst gesichert, wenn die Aufgabe einmal gespeichert wurde. Bis dahin
        gelten sie nur für dieses Fenster.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Frühere Stände werden geladen …
      </p>
    );
  }

  if (staende.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      {staende.map((s) => {
        const istAktuell = !!aktuellesFragment && s.fragment === aktuellesFragment;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onLaden?.(s)}
            title={s.anlass || undefined}
            className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-50 ${
              istAktuell
                ? 'border-violet-300 bg-violet-100 text-violet-900 font-semibold'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.uebernommen && <Check className="w-3 h-3 inline-block mr-1 text-emerald-600" />}
            {s.label || `Stand ${s.nummer}`}
          </button>
        );
      })}
    </div>
  );
}
