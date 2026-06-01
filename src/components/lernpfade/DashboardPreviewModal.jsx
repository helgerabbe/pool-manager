/**
 * DashboardPreviewModal.jsx
 *
 * Schüler-Vorschau für ein Lerntyp-Dashboard – im iPad-Rahmen.
 *
 * Schritt 2 (Gerüst der Schüler-App):
 *   - iPad-Frame (Landscape) als realistischer Container.
 *   - Obere Infoleiste: Fach · Einheit · Lerntyp + aktuelles Datum /
 *     "zuletzt gearbeitet"-Platzhalter.
 *   - Links: ein-/ausklappbares Burger-Menü (Navigation, vorerst Platzhalter).
 *   - Rechts: Arbeits-/Inhaltsbereich (vorerst "Inhalte folgen").
 *
 * Wird in den nächsten Schritten mit der echten Sektor-/Aufgaben-Ansicht
 * gefüllt.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  X, Menu, Sparkles, Layers, Trophy, Star, BookOpen, Calendar,
  Clock, GraduationCap, Home, NotebookPen, Settings, ChevronRight, Eye,
} from 'lucide-react';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, accent: 'bg-blue-600', soft: 'bg-blue-100 text-blue-700' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, accent: 'bg-amber-600', soft: 'bg-amber-100 text-amber-700' },
  passioniert: { label: 'Passioniert', icon: Star, accent: 'bg-violet-600', soft: 'bg-violet-100 text-violet-700' },
};

const NAV_ITEMS = [
  { icon: Home, label: 'Übersicht' },
  { icon: BookOpen, label: 'Lerneinheit' },
  { icon: NotebookPen, label: 'Lerntagebuch' },
  { icon: GraduationCap, label: 'KI-Tutor' },
  { icon: Settings, label: 'Einstellungen' },
];

function formatToday() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function DashboardPreviewModal({ open, onOpenChange, lerntyp, einheitTitel, fach }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const meta = LERNTYP_META[lerntyp] || { label: lerntyp || 'Dashboard', icon: Eye, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700' };
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96vh] w-[97vw] max-w-[1180px] overflow-visible bg-transparent border-0 shadow-none p-0">
        {/* iPad-Rahmen (Landscape) */}
        <div className="relative mx-auto rounded-[2.2rem] bg-slate-900 p-3 shadow-2xl" style={{ width: '100%', maxWidth: 1120 }}>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900"
            title="Vorschau schließen"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Display */}
          <div className="rounded-[1.5rem] overflow-hidden bg-slate-50 flex flex-col" style={{ height: '72vh', maxHeight: 720 }}>
            {/* ── Obere Infoleiste ───────────────────────────────── */}
            <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0"
                title={menuOpen ? 'Menü einklappen' : 'Menü ausklappen'}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  {fach || 'Fach'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-sm font-medium text-slate-700 truncate max-w-[260px]">
                  {einheitTitel || 'Einheit'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${meta.soft}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-4 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400" title="Zuletzt gearbeitet">
                  <Clock className="w-3.5 h-3.5" />
                  Zuletzt: —
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatToday()}
                </span>
              </div>
            </header>

            {/* ── Körper: Menü + Arbeitsbereich ──────────────────── */}
            <div className="flex-1 flex min-h-0">
              {/* Burger-Menü (ein-/ausklappbar) */}
              <aside
                className={`shrink-0 bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ${
                  menuOpen ? 'w-56' : 'w-0'
                }`}
              >
                <nav className="w-56 p-3 space-y-1">
                  {NAV_ITEMS.map((item, i) => {
                    const ItemIcon = item.icon;
                    const active = i === 1;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                          active
                            ? `${meta.accent} text-white`
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </div>
                    );
                  })}
                </nav>
              </aside>

              {/* Arbeitsbereich */}
              <main className="flex-1 overflow-y-auto p-6">
                <div className={`rounded-2xl ${meta.accent} text-white px-6 py-7 flex items-center gap-4 shadow-lg`}>
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                      {fach || 'Fach'} · {einheitTitel || 'Einheit'}
                    </div>
                    <div className="text-2xl font-bold leading-tight">Dashboard {meta.label}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <p className="text-base font-semibold text-slate-700">Inhalte folgen</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Hier entsteht in den nächsten Schritten der echte Arbeitsbereich für „{meta.label}".
                  </p>
                </div>
              </main>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}