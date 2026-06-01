/**
 * DashboardPreviewModal.jsx
 *
 * Schüler-Vorschau für ein Lerntyp-Dashboard – im iPad-Rahmen.
 *
 * Die linke Menüleiste IST das Dashboard: jedes Element, das im Pool-Manager
 * in den Lernpfad gezogen wurde, taucht hier in genau der konfigurierten
 * Reihenfolge auf.
 *
 * Sichtbarkeits-/Klick-Logik (Schritt 1: Minimalist):
 *   - Streng sequenziell: der Schüler arbeitet die Elemente der Reihe nach ab.
 *   - Bereits erledigte Elemente bleiben dauerhaft anklickbar (Nachschlagen).
 *   - Das aktuelle Element ist aktiv/anklickbar.
 *   - Noch nicht freigeschaltete Elemente werden angezeigt, sind aber gesperrt
 *     (Schloss-Icon, nicht klickbar).
 *   - Andere Lerntypen: vorerst alle Elemente frei anklickbar (folgt später).
 *
 * Der "erledigt"-Fortschritt ist hier reine Vorschau-Simulation
 * (lokaler State) – es werden keine echten Schülerdaten geschrieben.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Menu, Sparkles, Layers, Trophy, Star, BookOpen, Calendar, Clock,
  ChevronRight, ChevronLeft, RotateCw, Eye, Lock, CheckCircle2, Package,
  FileText, ArrowRight,
} from 'lucide-react';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700', ring: 'ring-slate-300' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, accent: 'bg-blue-600', soft: 'bg-blue-100 text-blue-700', ring: 'ring-blue-300' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, accent: 'bg-amber-600', soft: 'bg-amber-100 text-amber-700', ring: 'ring-amber-300' },
  passioniert: { label: 'Passioniert', icon: Star, accent: 'bg-violet-600', soft: 'bg-violet-100 text-violet-700', ring: 'ring-violet-300' },
};

function formatToday() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

/**
 * Flacht die Sektoren des Dashboards zu einer geordneten Liste von
 * Menü-Einträgen ab. Es werden nur Root-Items berücksichtigt
 * (parent_instance_id leer); Bündel-Kinder bleiben außen vor.
 */
function buildEntries(sektoren, aufgabenById, systemBausteineById) {
  const entries = [];
  (sektoren || []).forEach((sektor) => {
    (sektor.items || []).forEach((item) => {
      if (item.parent_instance_id) return; // Bündel-Kinder überspringen
      if (item.type === 'system') {
        const baustein = systemBausteineById?.get?.(item.ref_id);
        entries.push({
          key: item.instance_id || `${sektor.sektor_id}-${item.ref_id}`,
          label: baustein?.titel || 'Baustein',
          kind: 'system',
        });
      } else {
        const aufgabe = aufgabenById?.get?.(item.ref_id);
        entries.push({
          key: item.instance_id || `${sektor.sektor_id}-${item.ref_id}`,
          label: aufgabe?.titel || 'Aufgabe',
          kind: aufgabe?.aufgaben_typ === 'buendel' ? 'lernpaket' : 'aufgabe',
        });
      }
    });
  });
  return entries;
}

const KIND_ICON = { lernpaket: Package, system: Star, aufgabe: FileText };

export default function DashboardPreviewModal({
  open, onOpenChange, lerntyp, einheitTitel, fach,
  sektoren = [], aufgabenById, systemBausteineById,
}) {
  const [menuOpen, setMenuOpen] = useState(true);
  // Simulierter Fortschritt: wie viele Elemente gelten als "erledigt".
  const [completed, setCompleted] = useState(0);
  // Welches Element wird gerade im Arbeitsbereich angezeigt.
  const [selected, setSelected] = useState(0);

  const meta = LERNTYP_META[lerntyp] || { label: lerntyp || 'Dashboard', icon: Eye, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700', ring: 'ring-slate-300' };
  const Icon = meta.icon;
  const isSequential = lerntyp === 'minimalist';

  const entries = useMemo(
    () => buildEntries(sektoren, aufgabenById, systemBausteineById),
    [sektoren, aufgabenById, systemBausteineById]
  );

  // Beim Öffnen / Lerntyp-Wechsel den Fortschritt zurücksetzen.
  useEffect(() => {
    if (open) { setCompleted(0); setSelected(0); }
  }, [open, lerntyp]);

  // Status eines Eintrags: 'done' | 'current' | 'locked' | 'open'
  const statusOf = (idx) => {
    if (!isSequential) return 'open';
    if (idx < completed) return 'done';
    if (idx === completed) return 'current';
    return 'locked';
  };
  const isClickable = (idx) => statusOf(idx) !== 'locked';

  const selectedEntry = entries[selected];
  const selectedIsCurrent = isSequential && selected === completed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[97vw] max-w-[1200px] overflow-visible bg-transparent border-0 shadow-none p-0">
        {/* iPad-Rahmen – identische Optik wie IPadFrame */}
        <div className="bg-slate-800 rounded-[28px] p-3 shadow-2xl ring-1 ring-slate-900/10 mx-auto w-full">
          <div className="bg-white rounded-[18px] overflow-hidden flex flex-col" style={{ height: '78vh', maxHeight: 760 }}>

            {/* ── Safari-Andeutung ───────────────────────────────── */}
            <div className="h-9 shrink-0 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2">
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
                🔒 schule.moodle.de · {einheitTitel || 'Einheit'}
              </div>
            </div>

            {/* ── Infoleiste ─────────────────────────────────────── */}
            <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-1.5 flex items-center gap-3">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 shrink-0"
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
            <div className="flex-1 flex min-h-0 bg-slate-100">
              {/* Dashboard-Menü (ein-/ausklappbar) */}
              <aside
                className={`shrink-0 bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ${
                  menuOpen ? 'w-64' : 'w-0'
                }`}
              >
                <nav className="w-64 p-3 space-y-1 overflow-y-auto h-full">
                  <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Dein Lernweg
                  </p>

                  {entries.length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">
                      Für diesen Lerntyp wurden noch keine Elemente im Dashboard platziert.
                    </div>
                  )}

                  {entries.map((entry, idx) => {
                    const status = statusOf(idx);
                    const EntryIcon = KIND_ICON[entry.kind] || FileText;
                    const locked = status === 'locked';
                    const active = idx === selected;

                    return (
                      <button
                        key={entry.key}
                        disabled={locked}
                        onClick={() => { if (!locked) setSelected(idx); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                          locked
                            ? 'text-slate-400 cursor-not-allowed'
                            : active
                              ? `${meta.accent} text-white`
                              : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {/* Status-Indikator */}
                        <span className="shrink-0">
                          {status === 'done' ? (
                            <CheckCircle2 className={`w-4 h-4 ${active ? 'text-white' : 'text-emerald-500'}`} />
                          ) : locked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <EntryIcon className="w-4 h-4" />
                          )}
                        </span>
                        <span className="truncate flex-1">{entry.label}</span>
                        {status === 'current' && (
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? 'text-white/80' : 'text-slate-400'}`}>
                            Jetzt
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Arbeitsbereich */}
              <main className="flex-1 overflow-y-auto p-6">
                <div className={`rounded-2xl ${meta.accent} text-white px-6 py-6 flex items-center gap-4 shadow-lg`}>
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80 truncate">
                      {fach || 'Fach'} · {einheitTitel || 'Einheit'}
                    </div>
                    <div className="text-xl font-bold leading-tight">Dashboard {meta.label}</div>
                  </div>
                </div>

                {entries.length === 0 ? (
                  <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <p className="text-base font-semibold text-slate-700">Noch keine Inhalte</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Sobald du Elemente in das Dashboard ziehst, erscheinen sie hier als Lernweg.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-8">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {selectedIsCurrent ? 'Aktuelle Aufgabe' : selected < completed ? 'Bereits erledigt' : 'Vorschau'}
                    </div>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">
                      {selectedEntry?.label}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Hier öffnet sich später der eigentliche Inhalt dieses Elements
                      (Lernpaket, Aufgabe oder Baustein).
                    </p>

                    {/* Sequenz-Demo: aktuelles Element abschließen → nächstes frei */}
                    {selectedIsCurrent && completed < entries.length && (
                      <button
                        onClick={() => {
                          const next = Math.min(completed + 1, entries.length);
                          setCompleted(next);
                          setSelected(Math.min(next, entries.length - 1));
                        }}
                        className={`mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-xl ${meta.accent} text-white text-sm font-semibold shadow-sm hover:opacity-90`}
                      >
                        Diese Aufgabe abschließen
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {isSequential && selected < completed && (
                      <div className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Abgeschlossen – jederzeit wieder aufrufbar.
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}