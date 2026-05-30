/**
 * IPadFrame.jsx
 *
 * Visuelle iPad-Simulation für die Schüler-Vorschau (2026-05-30):
 * Stellt angedeutet Safari-Bar, App-Header und Lernpfad-Sidebar dar
 * und gibt dem eigentlichen Aufgaben-Inhalt einen FIXEN Slot von
 * 960 × 600 Pixeln. Was dort nicht reinpasst, wird scrollbar
 * — so erkennt die Lehrkraft sofort, ob die Aufgabe auf eine Slide passt.
 */
import React from 'react';
import { Home, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

// Verbindlicher Slot pro Slide (siehe Konzept-Entscheidung 2026-05-30)
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 600;

export default function IPadFrame({ children, lernpaketTitel = 'Lernpaket', phaseLabel = 'Aktivität' }) {
  return (
    <div className="bg-slate-800 rounded-[28px] p-3 shadow-2xl ring-1 ring-slate-900/10 mx-auto" style={{ width: 'fit-content' }}>
      <div className="bg-white rounded-[18px] overflow-hidden">
        {/* Safari-Andeutung */}
        <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="flex items-center gap-1 text-slate-400 ml-2">
            <ChevronLeft className="w-3.5 h-3.5" />
            <ChevronRight className="w-3.5 h-3.5" />
            <RotateCw className="w-3 h-3" />
          </div>
          <div className="flex-1 mx-2 h-5 bg-white rounded-md border border-slate-200 flex items-center px-2 text-[10px] text-slate-400 truncate">
            🔒 schule.moodle.de · {lernpaketTitel}
          </div>
        </div>

        {/* App-Header-Andeutung */}
        <div className="h-11 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center px-4 gap-3">
          <Home className="w-4 h-4 opacity-80" />
          <span className="text-sm font-semibold truncate">{lernpaketTitel}</span>
          <span className="ml-auto text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{phaseLabel}</span>
        </div>

        {/* Body: Sidebar + Slide */}
        <div className="flex bg-slate-100">
          {/* Sidebar / Fortschritt */}
          <aside className="w-[200px] bg-white border-r border-slate-200 p-3 space-y-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fortschritt</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center">✓</div>
                <div className="h-2 flex-1 bg-slate-100 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center">✓</div>
                <div className="h-2 flex-1 bg-slate-100 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                <div className="h-2 flex-1 bg-blue-100 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-200" />
                <div className="h-2 flex-1 bg-slate-100 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-200" />
                <div className="h-2 flex-1 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1">3 von 5 erledigt</p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-emerald-500" />
              </div>
            </div>
          </aside>

          {/* Inhalts-Slot — FIX 960×600 */}
          <div className="p-4 bg-slate-100 flex items-center justify-center">
            <div
              className="bg-white rounded-lg shadow-md ring-1 ring-slate-200 overflow-auto"
              style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}