/**
 * DashboardPreviewModal.jsx
 *
 * Interaktive Schüler-Vorschau eines Lerntyp-Dashboards im iPad-Rahmen
 * (Umbau 2026-06-12, "Deckungsgleiche Vorschau"-Projekt).
 *
 * Nutzt die ECHTE Gating-Engine der Schüleransicht
 * (lib/schuelerPfadGating + lib/schuelerPfadView) mit einem rein lokalen,
 * simulierten Fortschritt. Damit verhält sich die Vorschau exakt wie das
 * spätere Schüler-Dashboard: Sektor-Freischaltung (sofort / nach Sektor),
 * sequenzielles vs. freies Item-Gating, Bündel-Auflösung, Schloss-Tooltips.
 *
 * Vereinfachung (bewusste Konzept-Entscheidung): Die Aufgaben-INHALTE werden
 * NICHT als echte Vorschau gerendert (keine Lückentext-/Quiz-Generierung) –
 * stattdessen zeigt der Arbeitsbereich pro Element einen Platzhalter
 * („Hier sieht der Schüler dann: …") plus einen „Erledigt"-Button, mit dem
 * die Lehrkraft die Reihenfolge/Freischaltung durchklicken kann.
 * Es werden KEINE echten Schülerdaten geschrieben.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Menu, Sparkles, Layers, Trophy, Star, BookOpen, Calendar, Clock,
  ChevronRight, ChevronLeft, RotateCw, Eye, Lock, CheckCircle2,
  ArrowRight, RotateCcw, Map as MapIcon, Info,
} from 'lucide-react';
import {
  ITEM_GATE,
  annotateSektorForSchueler,
  deriveSektorFreischaltung,
  istSektorErledigt,
} from '@/lib/schuelerPfadGating';
import { buildSichtbarePfadItems } from '@/lib/schuelerPfadView';
import { normalizeSektor } from '@/lib/lernpfadeUtils';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { getSektorTypLabel } from '@/lib/sektorTypen';
import { cn } from '@/lib/utils';

const LERNTYP_META = {
  minimalist: { label: 'Minimalist', icon: Sparkles, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700' },
  pragmatiker: { label: 'Pragmatiker', icon: Layers, accent: 'bg-blue-600', soft: 'bg-blue-100 text-blue-700' },
  ehrgeizig: { label: 'Ehrgeizig', icon: Trophy, accent: 'bg-amber-600', soft: 'bg-amber-100 text-amber-700' },
  passioniert: { label: 'Passioniert', icon: Star, accent: 'bg-violet-600', soft: 'bg-violet-100 text-violet-700' },
};

function formatToday() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function DashboardPreviewModal({
  open, onOpenChange, lerntyp, einheitTitel, fach,
  sektoren = [], aufgabenById, systemBausteineById,
}) {
  const [menuOpen, setMenuOpen] = useState(true);
  // Simulierter Schüler-Fortschritt: Set<instance_id> der erledigten Items (lokal).
  const [erledigtSet, setErledigtSet] = useState(() => new Set());
  const [activeInstanceId, setActiveInstanceId] = useState(null); // null = Startseite

  const meta = LERNTYP_META[lerntyp] || { label: lerntyp || 'Dashboard', icon: Eye, accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700' };
  const Icon = meta.icon;

  // Beim Öffnen / Lerntyp-Wechsel zurücksetzen.
  useEffect(() => {
    if (open) { setErledigtSet(new Set()); setActiveInstanceId(null); setMenuOpen(true); }
  }, [open, lerntyp]);

  // Sektoren normalisieren (Pflicht-Vorbedingung der Gating-Engine).
  const normSektoren = useMemo(() => (sektoren || []).map(normalizeSektor), [sektoren]);

  // Fortschritts-Map im Format der Gating-Engine (instance_id → status).
  const fortschrittByInstance = useMemo(() => {
    const map = new Map();
    erledigtSet.forEach((id) => map.set(id, 'erledigt'));
    return map;
  }, [erledigtSet]);

  // Identische Ableitung wie pages/schueler/EinheitDashboard: pro Sektor
  // annotieren + sichtbare Items aufbauen, dann zur flachen Liste mergen.
  const { flatItems, sektorGroups } = useMemo(() => {
    const sektorFrei = deriveSektorFreischaltung(normSektoren, fortschrittByInstance);
    const flat = [];
    const groups = [];
    for (const sektor of normSektoren) {
      const frei = sektorFrei.get(sektor.sektor_id);
      const annotated = annotateSektorForSchueler(sektor, fortschrittByInstance, systemBausteineById);
      const sichtbar = buildSichtbarePfadItems(
        sektor,
        annotated,
        aufgabenById,
        systemBausteineById,
        !!frei?.freigeschaltet,
        frei?.voraussetzungTitel
      );
      const items = sichtbar.map((item) => ({
        ...item,
        sektor,
        sektorFreigeschaltet: !!frei?.freigeschaltet,
      }));
      flat.push(...items);
      groups.push({
        sektor,
        freigeschaltet: !!frei?.freigeschaltet,
        fertig: istSektorErledigt(sektor, fortschrittByInstance),
        items,
      });
    }
    return { flatItems: flat, sektorGroups: groups };
  }, [normSektoren, fortschrittByInstance, aufgabenById, systemBausteineById]);

  const gesamtAnzahl = flatItems.length;
  const erledigtAnzahl = flatItems.filter((it) => it.gate === ITEM_GATE.ERLEDIGT).length;

  const activeItem = activeInstanceId
    ? flatItems.find((it) => it.instance_id === activeInstanceId) || null
    : null;

  // „Weiter": nächstes nicht-gesperrtes, offenes Item nach dem aktuellen –
  // gegen den FRISCHEN Fortschritt gerechnet (nach dem Erledigt-Markieren).
  const goWeiter = (fromInstanceId, neuesErledigtSet) => {
    const map = new Map();
    neuesErledigtSet.forEach((id) => map.set(id, 'erledigt'));
    const sektorFrei = deriveSektorFreischaltung(normSektoren, map);
    const liste = [];
    for (const sektor of normSektoren) {
      const frei = sektorFrei.get(sektor.sektor_id);
      const annotated = annotateSektorForSchueler(sektor, map, systemBausteineById);
      const sichtbar = buildSichtbarePfadItems(
        sektor, annotated, aufgabenById, systemBausteineById,
        !!frei?.freigeschaltet, frei?.voraussetzungTitel
      );
      sichtbar.forEach((item) => liste.push({ ...item, sektorFreigeschaltet: !!frei?.freigeschaltet }));
    }
    const idx = liste.findIndex((it) => it.instance_id === fromInstanceId);
    const next = liste.slice(idx + 1).find(
      (it) => it.sektorFreigeschaltet && it.gate !== ITEM_GATE.GESPERRT && it.gate !== ITEM_GATE.ERLEDIGT
    );
    if (next) setActiveInstanceId(next.instance_id);
    else { setActiveInstanceId(null); setMenuOpen(true); }
  };

  const handleErledigt = () => {
    if (!activeItem) return;
    const neu = new Set(erledigtSet);
    neu.add(activeItem.instance_id);
    setErledigtSet(neu);
    goWeiter(activeItem.instance_id, neu);
  };

  const handleReset = () => {
    setErledigtSet(new Set());
    setActiveInstanceId(null);
  };

  const ActiveIcon = activeItem ? getSystemBausteinIcon(activeItem.meta.iconKey) : null;
  const activeErledigt = activeItem?.gate === ITEM_GATE.ERLEDIGT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[97vw] max-w-[1200px] overflow-visible bg-transparent border-0 shadow-none p-0">
        <TooltipProvider delayDuration={150}>
        {/* Hinweis: Funktions-Vorschau, kein 1:1-Original */}
        <div className="mx-auto w-full mb-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Hinweis:</span> Du siehst hier nicht das absolute Original –
            diese Vorschau soll dir ein Gefühl dafür geben, wie das Dashboard für den Schüler
            im <span className="font-semibold">Ablauf</span> funktioniert. So kannst du prüfen, ob deine
            Einstellungen (Reihenfolge, Freischaltungen, Sektoren) tatsächlich so greifen, wie du es möchtest.
            Die volle Funktionstüchtigkeit siehst du, wenn du einmal in den <span className="font-semibold">Schülerbereich</span> wechselst
            und es dir dort anschaust.
          </p>
        </div>
        {/* iPad-Rahmen – identische Optik wie IPadFrame */}
        <div className="bg-slate-800 rounded-[28px] p-3 shadow-2xl ring-1 ring-slate-900/10 mx-auto w-full">
          <div className="bg-white rounded-[18px] overflow-hidden flex flex-col" style={{ height: '74vh', maxHeight: 720 }}>

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
                <span className="text-sm font-medium text-slate-700 truncate max-w-[240px]">
                  {einheitTitel || 'Einheit'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${meta.soft}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-3 shrink-0">
                {gesamtAnzahl > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {erledigtAnzahl} / {gesamtAnzahl}
                  </span>
                )}
                {erledigtAnzahl > 0 && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                    title="Simulierten Fortschritt zurücksetzen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400" title="Zuletzt gearbeitet">
                  <Clock className="w-3.5 h-3.5" />
                  Zuletzt: —
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatToday()}
                </span>
              </div>
            </header>

            {/* ── Körper: Lernpfad-Menü + Arbeitsbereich ─────────── */}
            <div className="flex-1 flex min-h-0 bg-slate-100">
              {/* Lernpfad-Navigation – wie das Schüler-Burger-Menü, hier
                  als eingebettete Sidebar, gruppiert nach Sektoren. */}
              <aside
                className={`shrink-0 bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 ${
                  menuOpen ? 'w-72' : 'w-0'
                }`}
              >
                <nav className="w-72 p-3 space-y-4 overflow-y-auto h-full">
                  {sektorGroups.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Für dieses Dashboard wurde noch kein Lernpfad eingerichtet.
                    </p>
                  )}

                  {sektorGroups.map(({ sektor, freigeschaltet, fertig, items }) => (
                    <div key={sektor.sektor_id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {getSektorTypLabel(sektor.sektor_typ)}
                        </span>
                        {!freigeschaltet && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <p className={cn(
                        'text-sm font-semibold mb-1.5 flex items-center gap-1.5',
                        fertig ? 'text-emerald-700' : 'text-slate-800'
                      )}>
                        {sektor.titel}
                        {fertig && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </p>

                      {items.length === 0 ? (
                        <p className="text-xs text-slate-400 italic pl-1">Keine Inhalte.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {items.map((item) => {
                            const ItemIcon = getSystemBausteinIcon(item.meta.iconKey);
                            const gesperrt = item.gate === ITEM_GATE.GESPERRT;
                            const erledigt = item.gate === ITEM_GATE.ERLEDIGT;
                            const aktiv = activeInstanceId === item.instance_id;

                            return (
                              <li key={item.instance_id}>
                                <button
                                  disabled={gesperrt}
                                  onClick={() => { if (!gesperrt) setActiveInstanceId(item.instance_id); }}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors',
                                    gesperrt && 'opacity-60 cursor-not-allowed text-slate-400',
                                    !gesperrt && !aktiv && 'text-slate-600 hover:bg-slate-100',
                                    aktiv && `${meta.accent} text-white`
                                  )}
                                >
                                  <span className="relative shrink-0">
                                    <ItemIcon className={cn('w-4 h-4', aktiv ? 'text-white' : erledigt ? 'text-emerald-600' : 'text-slate-400')} />
                                    {erledigt && !aktiv && (
                                      <CheckCircle2 className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-emerald-600 bg-white rounded-full" />
                                    )}
                                  </span>
                                  <span className={cn('truncate flex-1', erledigt && !aktiv && 'text-emerald-700 font-medium')}>
                                    {item.meta.titel}
                                  </span>
                                  {gesperrt && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          onClick={(e) => e.stopPropagation()}
                                          className="shrink-0 p-0.5 rounded pointer-events-auto"
                                        >
                                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-[220px] z-[10000]">
                                        {item.lockReason}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ))}
                </nav>
              </aside>

              {/* Arbeitsbereich */}
              <main className="flex-1 overflow-y-auto p-6">
                {flatItems.length === 0 ? (
                  <div className="h-full rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center px-6 py-14 text-center">
                    <p className="text-base font-semibold text-slate-700">Noch keine Inhalte</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Sobald du Elemente in das Dashboard ziehst, erscheinen sie hier als Lernweg.
                    </p>
                  </div>
                ) : !activeItem ? (
                  /* Startseite – wie die Pfad-Startseite des Schülers */
                  <div className="h-full rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center px-8 py-10 text-center">
                    <div className={`w-16 h-16 rounded-2xl ${meta.soft} flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{einheitTitel || 'Einheit'}</h3>
                    <p className="mt-2 text-sm text-slate-500 max-w-md">
                      So startet der Schüler in dein {meta.label}-Dashboard. Über das Menü links wählt
                      er sein nächstes Element – gesperrte Elemente werden erst durch Erledigen
                      der Voraussetzungen freigeschaltet.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-full px-4 py-2">
                      <MapIcon className="w-4 h-4 text-slate-500" />
                      {erledigtAnzahl} von {gesamtAnzahl} Elementen erledigt
                    </div>
                    <button
                      onClick={() => {
                        const next = flatItems.find(
                          (it) => it.sektorFreigeschaltet && it.gate === ITEM_GATE.AKTIV
                        ) || flatItems.find((it) => it.gate !== ITEM_GATE.GESPERRT);
                        if (next) setActiveInstanceId(next.instance_id);
                      }}
                      className={`mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-xl ${meta.accent} text-white text-sm font-semibold shadow-sm hover:opacity-90`}
                    >
                      {erledigtAnzahl === 0 ? 'Loslegen' : 'Weiterlernen'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Platzhalter-Ansicht des aktiven Elements */
                  <div className="h-full rounded-2xl border border-slate-200 bg-white px-8 py-8 flex flex-col">
                    <div className="flex items-start gap-3">
                      {ActiveIcon && (
                        <div className={`w-11 h-11 rounded-xl ${meta.soft} flex items-center justify-center shrink-0`}>
                          <ActiveIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {getSektorTypLabel(activeItem.sektor?.sektor_typ)} · {activeItem.sektor?.titel}
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                          {activeItem.meta.titel}
                        </h3>
                        {activeItem.meta.untertitel && (
                          <p className="text-sm text-slate-500 mt-0.5">{activeItem.meta.untertitel}</p>
                        )}
                      </div>
                    </div>

                    {/* Inhalts-Platzhalter (bewusst keine echte Aufgaben-Vorschau) */}
                    <div className="mt-6 flex-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center px-8 py-10">
                      <Eye className="w-8 h-8 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600 max-w-md">
                        {activeItem.meta.platzhalter}
                      </p>
                      <p className="mt-2 text-xs text-slate-400 max-w-md">
                        In dieser Dashboard-Vorschau geht es um den Ablauf – die detaillierte
                        Schüleransicht jeder Aufgabe findest du über den Vorschau-Button
                        an der jeweiligen Aufgabe.
                      </p>
                    </div>

                    {/* Aktionszeile: Erledigt simulieren / Status */}
                    <div className="mt-5 flex items-center gap-3">
                      {activeErledigt ? (
                        <span className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Abgeschlossen – jederzeit wieder aufrufbar.
                        </span>
                      ) : (
                        <button
                          onClick={handleErledigt}
                          className={`inline-flex items-center gap-2 h-10 px-5 rounded-xl ${meta.accent} text-white text-sm font-semibold shadow-sm hover:opacity-90`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Habe ich erledigt
                        </button>
                      )}
                      <button
                        onClick={() => setActiveInstanceId(null)}
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Zur Übersicht
                      </button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}