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
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Menu, Sparkles, Layers, Trophy, Star, BookOpen, Calendar, Clock,
  ChevronRight, ChevronLeft, RotateCw, Eye, Lock, CheckCircle2, Package,
  FileText, ArrowRight, ClipboardCheck, Compass, RefreshCw, Check, X,
} from 'lucide-react';

// Standard-Elemente, die eine KI-Vorschau besitzen. Sie werden in der
// Dashboard-Vorschau NICHT automatisch generiert (Credits/Zeit) – stattdessen
// zeigt das Modal eine Erklärung + „Vorschau jetzt erstellen"-Button, der das
// jeweilige dedizierte Vorschau-Fenster öffnet.
const PREVIEW_BAUSTEINE = {
  sys_sec0_overview: {
    icon: BookOpen,
    titel: 'Kurze Einführung in die Einheit',
    was: 'Hier bekommt der Schüler einen kompakten, schülergerechten Überblick über die Einheit, bevor er startet.',
    accent: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  sys_sec0_qblock: {
    icon: Compass,
    titel: 'Freiwilliger Fragenblock',
    was: 'Hier schätzt der Schüler per Schieberegler ein, wie sicher er sich bei den Themen schon fühlt – als Orientierung für die Lerntyp-Wahl.',
    accent: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  sys_diagnose_entry: {
    icon: ClipboardCheck,
    titel: 'Einstiegsdiagnose',
    was: 'Hier überprüft der Schüler mit ein paar Multiple-Choice-Fragen sein Vorwissen, bevor er mit der Einheit startet.',
    accent: 'text-rose-600',
    bg: 'bg-rose-100',
  },
};

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
          refId: item.ref_id,
        });
      } else {
        const aufgabe = aufgabenById?.get?.(item.ref_id);
        entries.push({
          key: item.instance_id || `${sektor.sektor_id}-${item.ref_id}`,
          label: aufgabe?.titel || 'Aufgabe',
          kind: aufgabe?.aufgaben_typ === 'buendel' ? 'lernpaket' : 'aufgabe',
          refId: item.ref_id,
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
  einfuehrungSnapshot, qblockSnapshot, diagnoseQuizSnapshot,
  onPreviewEinfuehrung, onPreviewQblock, onPreviewDiagnoseQuiz,
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
  const showEinfuehrung = selectedEntry?.refId === 'sys_sec0_overview' && !!einfuehrungSnapshot;
  const showQblock = selectedEntry?.refId === 'sys_sec0_qblock' && !!qblockSnapshot;
  const showDiagnoseQuiz = selectedEntry?.refId === 'sys_diagnose_entry' && !!diagnoseQuizSnapshot;

  // Lokaler Antwort-State für die interaktive Diagnose-Quiz-Anzeige.
  const [quizAntworten, setQuizAntworten] = useState({});
  useEffect(() => { setQuizAntworten({}); }, [selected, diagnoseQuizSnapshot]);

  // Ein Standard-Element mit Vorschau-Funktion, das noch KEINEN Snapshot hat,
  // bekommt den Erklär-/Generieren-Hinweis (statt automatischer Generierung).
  const previewMeta = selectedEntry ? PREVIEW_BAUSTEINE[selectedEntry.refId] : null;
  const previewHandler = selectedEntry?.refId === 'sys_sec0_overview'
    ? onPreviewEinfuehrung
    : selectedEntry?.refId === 'sys_sec0_qblock'
    ? onPreviewQblock
    : selectedEntry?.refId === 'sys_diagnose_entry'
    ? onPreviewDiagnoseQuiz
    : null;
  const hasSnapshotForSelected = showEinfuehrung || showQblock || showDiagnoseQuiz;
  const showPlaceholderHint = !!previewMeta && !hasSnapshotForSelected;

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
                {entries.length === 0 ? (
                  <div className="h-full rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center px-6 py-14 text-center">
                    <p className="text-base font-semibold text-slate-700">Noch keine Inhalte</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Sobald du Elemente in das Dashboard ziehst, erscheinen sie hier als Lernweg.
                    </p>
                  </div>
                ) : (
                  <div className="h-full rounded-2xl border border-slate-200 bg-white px-8 py-8 flex flex-col">
                    {showEinfuehrung ? (
                      <div className="flex-1 overflow-y-auto -mx-2 px-2">
                        {einfuehrungSnapshot.imageUrl && (
                          <img src={einfuehrungSnapshot.imageUrl} alt="" className="w-full h-44 object-cover rounded-xl" />
                        )}
                        <h3 className="mt-4 text-2xl font-bold text-slate-900">
                          {einfuehrungSnapshot.titel || selectedEntry?.label}
                        </h3>
                        {einfuehrungSnapshot.intro && (
                          <p className="mt-2 text-base text-slate-600">{einfuehrungSnapshot.intro}</p>
                        )}
                        <div className="mt-4 space-y-4">
                          {(einfuehrungSnapshot.abschnitte || []).map((a, i) => (
                            <div key={i} className="flex gap-3">
                              <div className="text-2xl leading-none shrink-0">{a.emoji || '✨'}</div>
                              <div>
                                {a.ueberschrift && (
                                  <h4 className="font-semibold text-slate-800">{a.ueberschrift}</h4>
                                )}
                                <div className="text-sm text-slate-600 prose prose-sm max-w-none">
                                  <ReactMarkdown>{a.text || ''}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : showQblock ? (
                      <div className="flex-1 overflow-y-auto -mx-2 px-2">
                        <h3 className="text-2xl font-bold text-slate-900">
                          {qblockSnapshot.titel || selectedEntry?.label}
                        </h3>
                        {qblockSnapshot.intro && (
                          <p className="mt-2 text-base text-slate-600">{qblockSnapshot.intro}</p>
                        )}
                        <div className="mt-4 space-y-3">
                          {(qblockSnapshot.fragen || []).map((f, i) => (
                            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-medium text-slate-800">
                                <span className="text-violet-500 font-bold mr-1.5">{i + 1}.</span>
                                {f.frage}
                              </p>
                              <div className="mt-3 h-1.5 rounded-full bg-slate-200 relative">
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-violet-500 shadow" />
                              </div>
                              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                                <span>{f.links_label}</span>
                                <span>{f.rechts_label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {qblockSnapshot.hinweis && (
                          <p className="mt-4 text-xs text-slate-400">{qblockSnapshot.hinweis}</p>
                        )}
                      </div>
                    ) : showDiagnoseQuiz ? (
                      <div className="flex-1 overflow-y-auto -mx-2 px-2">
                        <h3 className="text-2xl font-bold text-slate-900">
                          {diagnoseQuizSnapshot.titel || selectedEntry?.label}
                        </h3>
                        {diagnoseQuizSnapshot.intro && (
                          <p className="mt-2 text-base text-slate-600">{diagnoseQuizSnapshot.intro}</p>
                        )}
                        <div className="mt-4 space-y-3">
                          {(diagnoseQuizSnapshot.fragen || []).map((f, i) => {
                            const gewaehlt = quizAntworten[i];
                            return (
                              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-medium text-slate-800">
                                  <span className="text-rose-500 font-bold mr-1.5">{i + 1}.</span>
                                  {f.frage}
                                </p>
                                <div className="mt-3 space-y-2">
                                  {(f.optionen || []).map((opt, oi) => {
                                    const isChosen = gewaehlt === oi;
                                    const isCorrect = oi === f.richtige_antwort_index;
                                    let cls = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                                    if (gewaehlt !== undefined) {
                                      if (isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                                      else if (isChosen) cls = 'border-red-300 bg-red-50 text-red-700';
                                      else cls = 'border-slate-200 bg-white text-slate-500';
                                    }
                                    return (
                                      <button
                                        key={oi}
                                        type="button"
                                        onClick={() => setQuizAntworten((prev) => ({ ...prev, [i]: oi }))}
                                        className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cls}`}
                                      >
                                        <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                                          {String.fromCharCode(65 + oi)}
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                        {gewaehlt !== undefined && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                        {gewaehlt !== undefined && isChosen && !isCorrect && <X className="w-4 h-4 text-red-500 shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : showPlaceholderHint ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 max-w-md mx-auto">
                        <div className={`w-14 h-14 rounded-2xl ${previewMeta.bg} flex items-center justify-center mb-4`}>
                          {React.createElement(previewMeta.icon, { className: `w-7 h-7 ${previewMeta.accent}` })}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{previewMeta.titel}</h3>
                        <p className="mt-1.5 text-sm text-slate-600">{previewMeta.was}</p>
                        <p className="mt-3 text-xs text-slate-400">
                          Für dieses Element wurde noch keine Vorschau erstellt.
                        </p>
                        {previewHandler && (
                          <button
                            onClick={previewHandler}
                            className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-slate-800 text-white text-sm font-semibold shadow-sm hover:bg-slate-700"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Vorschau jetzt erstellen
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {selectedEntry?.label}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Hier öffnet sich später der eigentliche Inhalt dieses Elements
                          (Lernpaket, Aufgabe oder Baustein).
                        </p>
                      </>
                    )}

                    {selectedIsCurrent && completed < entries.length && (
                      <button
                        onClick={() => {
                          const next = Math.min(completed + 1, entries.length);
                          setCompleted(next);
                          setSelected(Math.min(next, entries.length - 1));
                        }}
                        className={`mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl ${meta.accent} text-white text-sm font-semibold shadow-sm hover:opacity-90`}
                      >
                        Diese Aufgabe abschließen
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {isSequential && selected < completed && (
                      <div className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
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