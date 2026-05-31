/**
 * LehrwerkQuelleBody.jsx
 *
 * Schüler-Vorschau für die Input-Aktivität "Lehrwerk / Quelle".
 * Zeigt die Aufgabenstellung sowie den Buch-/Quellenverweis als Karte.
 */
import React from 'react';
import { BookOpen } from 'lucide-react';

export default function LehrwerkQuelleBody({ fieldValues = {} }) {
  const fv = fieldValues || {};
  const quelle = fv.buchtitel || fv.quelle || fv.titel || '';
  const seite = fv.seiten || fv.seite;
  const nummer = fv.nummer;
  const beschreibung = fv.beschreibung || '';

  return (
    <div className="px-6 py-5 h-full overflow-y-auto space-y-4">
      {fv.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900">
          {fv.aufgabentext}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border-b border-amber-100">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Im Lehrwerk</p>
            <p className="text-sm font-semibold text-slate-800">{quelle || 'Quellenangabe'}</p>
          </div>
        </div>

        {(seite || nummer || beschreibung) && (
          <div className="px-4 py-3 space-y-2">
            {(seite || nummer) && (
              <div className="flex flex-wrap gap-2">
                {seite && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                    Seite(n) {seite}
                  </span>
                )}
                {nummer && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                    Aufgabe {nummer}
                  </span>
                )}
              </div>
            )}
            {beschreibung && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{beschreibung}</p>
            )}
          </div>
        )}
      </div>

      {!quelle && !beschreibung && (
        <p className="text-sm text-slate-500 italic">Noch keine Quellenangabe hinterlegt.</p>
      )}
    </div>
  );
}