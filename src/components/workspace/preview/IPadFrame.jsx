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
import { Home, ChevronLeft, ChevronRight, RotateCw, Menu } from 'lucide-react';
import ExternesThemeStyle from '@/components/schueler/ExternesThemeStyle';

// Verbindlicher Slot pro Slide (siehe Konzept-Entscheidung 2026-05-30)
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 600;

// Gesamtmaße des iPad-Rahmens (Slot + Innen-/Außen-Padding + Safari- & App-Leiste).
// Werden für die verlustfreie CSS-Skalierung der Vorschau benötigt.
const FRAME_WIDTH = SLIDE_WIDTH + 32 + 24;            // Slot + p-4 + p-3
const FRAME_HEIGHT = SLIDE_HEIGHT + 32 + 24 + 36 + 44; // Slot + Paddings + Safari-Bar + App-Header

export default function IPadFrame({ children, lernpaketTitel = 'Lernpaket', phaseLabel = 'Aktivität', scale = 0.7 }) {
  return (
    <div
      className="mx-auto"
      style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}
    >
    {/* Zentrales CSS aus dem GitHub-CSS-Connector: aktiv, solange die Vorschau offen ist,
        damit Lehrkräfte exakt das sehen, was Schüler:innen später sehen. */}
    <ExternesThemeStyle />
    <div
      className="bg-slate-800 rounded-[28px] p-3 shadow-2xl ring-1 ring-slate-900/10"
      style={{ width: FRAME_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
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

        {/* App-Header-Andeutung — mit Burger-Menü statt fester Sidebar,
            so wie es Schüler:innen tatsächlich sehen */}
        <div className="h-11 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center px-4 gap-3">
          <Menu className="w-4 h-4 opacity-90" />
          <Home className="w-4 h-4 opacity-80" />
          <span className="text-sm font-semibold truncate">{lernpaketTitel}</span>
          <span className="ml-auto text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{phaseLabel}</span>
        </div>

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