/**
 * LernpaketPreviewModal.jsx
 *
 * Vollständige Schüler-Vorschau eines ganzen Lernpakets im iPad-Frame.
 * Links: klickbare Sidebar mit allen Aktivitäten (gruppiert nach Phase).
 * Rechts: Inhalt der gerade gewählten Aktivität — vereinfachte Render-Varianten
 * der bekannten Aktivitätstypen (Text lesen, Video/Audio, Link/URL, KI-Tutor,
 * Lückentext, Test). Andere Typen zeigen den Aufgabentext.
 */
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Eye, Home, ChevronLeft, ChevronRight, RotateCw, BookOpen,
  ExternalLink, Target,
} from 'lucide-react';
import LueckentextBody from '@/components/workspace/preview/bodies/LueckentextBody';
import TestBody from '@/components/workspace/preview/bodies/TestBody';
import KITutorBody from '@/components/workspace/preview/bodies/KITutorBody';
import MatchTermsBody from '@/components/workspace/preview/bodies/MatchTermsBody';
import SortingListBody from '@/components/workspace/preview/bodies/SortingListBody';
import ConfirmationBody from '@/components/workspace/preview/bodies/ConfirmationBody';
import ImageLabelingBody from '@/components/workspace/preview/bodies/ImageLabelingBody';
import LehrwerkQuelleBody from '@/components/workspace/preview/bodies/LehrwerkQuelleBody';

const SLIDE_W = 960;
const SLIDE_H = 600;

const PHASE_META = {
  'Input':     { label: 'Input',     subtitle: 'Hier erklären wir dir, was du wissen und können sollst.', bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-900',  pill: 'bg-emerald-100 text-emerald-700' },
  'Übung':     { label: 'Übung',     subtitle: 'Hier übst du, was du gelernt hast.',                       bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800', pill: 'bg-pink-100 text-pink-700' },
  'Abschluss': { label: 'Abschluss', subtitle: 'Hier zeigst du, was du kannst.',                           bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800', pill: 'bg-blue-100 text-blue-700' },
};

function PhaseBar({ phase }) {
  const c = PHASE_META[phase];
  if (!c) return null;
  return (
    <div className={`px-4 py-1.5 ${c.bg} border-b ${c.border} text-[12px] ${c.text} shrink-0`}>
      <span className="font-semibold">{c.label} ·</span> {c.subtitle}
    </div>
  );
}

// ─── Aktivitäts-Renderer (vereinfacht, read-only) ──────────────────────

function TextLesenBody({ fv }) {
  const inhaltTyp = fv?.inhalt_typ;
  return (
    <div className="px-6 py-4 space-y-3">
      {fv?.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900">{fv.aufgabentext}</div>
      )}
      {fv?.titel && <h1 className="text-lg font-bold text-slate-900">{fv.titel}</h1>}
      {(!inhaltTyp || inhaltTyp === 'text') && fv?.inhalt && (
        <p className="text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">{fv.inhalt}</p>
      )}
      {Array.isArray(fv?.bilder) && fv.bilder.length > 0 && (
        <div className={`grid gap-3 ${fv.bilder.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {fv.bilder.map((b, i) => (
            <figure key={i} className="rounded-lg border overflow-hidden bg-slate-50">
              <img src={b?.url} alt={b?.caption || ''} className="w-full h-auto max-h-60 object-contain" />
              {b?.caption && <figcaption className="px-2 py-1 text-xs text-slate-500 border-t bg-white">{b.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {inhaltTyp === 'datei' && fv?.dokument_url && (
        <a href={fv.dokument_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 underline text-sm">
          <ExternalLink className="w-4 h-4" /> Dokument öffnen
        </a>
      )}
    </div>
  );
}

function VideoAudioBody({ fv }) {
  const url = fv?.url || '';
  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(url);
  const isVideo = /\.(mp4|webm|mov)$/i.test(url);

  let embed = null;
  if (isYouTube) {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
    if (id) embed = <iframe src={`https://www.youtube.com/embed/${id}`} className="w-full h-full" allowFullScreen />;
  } else if (isVimeo) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (id) embed = <iframe src={`https://player.vimeo.com/video/${id}`} className="w-full h-full" allowFullScreen />;
  } else if (isVideo) {
    embed = <video src={url} controls className="w-full h-full bg-black" />;
  } else if (isAudio) {
    embed = <audio src={url} controls className="w-full" />;
  }

  return (
    <div className="px-6 py-4 flex flex-col gap-3 h-full">
      {fv?.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 shrink-0">{fv.aufgabentext}</div>
      )}
      {fv?.titel && <h1 className="text-lg font-bold text-slate-900 shrink-0">{fv.titel}</h1>}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        {embed || (
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-white underline inline-flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Medium öffnen
            </a>
          ) : <span className="text-slate-400 text-sm">Kein Medium hinterlegt.</span>
        )}
      </div>
    </div>
  );
}

function LinkBody({ fv }) {
  const list = Array.isArray(fv?.webadressen) && fv.webadressen.length
    ? fv.webadressen
    : (fv?.url ? [{ url: fv.url, label: fv?.titel || null }] : []);
  return (
    <div className="px-6 py-4 space-y-3 h-full flex flex-col">
      {fv?.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 shrink-0">{fv.aufgabentext}</div>
      )}
      {fv?.titel && <h1 className="text-lg font-bold text-slate-900 shrink-0">{fv.titel}</h1>}
      <div className={`grid gap-3 ${list.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} flex-1 min-h-0 overflow-y-auto`}>
        {list.map((l, i) => {
          const url = typeof l === 'string' ? l : l?.url;
          const label = typeof l === 'string' ? null : l?.label;
          if (!url) return null;
          let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border bg-white overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                <img src={`https://image.thum.io/get/width/1200/${url}`} alt="" className="w-full h-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-700 truncate">{label || host}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            </a>
          );
        })}
        {list.length === 0 && <p className="italic text-slate-500 text-sm">Keine Links hinterlegt.</p>}
      </div>
    </div>
  );
}

// Lückentext / Test / KI-Tutor werden über die importierten Body-Komponenten
// gerendert (siehe components/workspace/preview/bodies/). Hier nur noch ein
// kleiner Helper für leere Master-Listen.
function LeerHinweis({ text }) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <p className="text-sm text-slate-500 italic">{text}</p>
    </div>
  );
}

function OffeneBody({ fv }) {
  const html = fv?.approved_snapshot_html;
  if (!html) {
    return (
      <div className="px-6 py-4 space-y-3">
        {fv?.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900 whitespace-pre-wrap">{fv.description}</div>
        )}
        <p className="italic text-slate-500 text-sm">Noch keine Vorschau-Vorlage gespeichert. Öffne die Aufgabe und erstelle die Vorschau.</p>
      </div>
    );
  }
  return (
    <iframe
      title="Offene Aufgabe"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full border-0"
    />
  );
}

function DefaultBody({ fv }) {
  return (
    <div className="px-6 py-4">
      {fv?.aufgabentext ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900">{fv.aufgabentext}</div>
      ) : (
        <p className="italic text-slate-500 text-sm">Vorschau für diesen Aktivitätstyp folgt.</p>
      )}
    </div>
  );
}

// Welche Master-Variante ist aktuell für eine Activity ausgewählt?
// state lebt in der Hauptkomponente, hier nur das Rendering.
function renderActivityBody(activity, katalogName, masters, variantIdx) {
  const name = (katalogName || '').toLowerCase();
  const fv = activity?.field_values || {};
  const selectedMaster = masters[variantIdx] || masters[0] || null;

  if (name.includes('text lesen')) return <TextLesenBody fv={fv} />;
  if (name.includes('video') || name.includes('audio')) return <VideoAudioBody fv={fv} />;
  if (name.includes('link') || name.includes('url')) return <LinkBody fv={fv} />;

  if (name.includes('ki-tutor') || name.includes('ki-check')) {
    return (
      <KITutorBody
        key={selectedMaster?.id || activity.id}
        masterFieldValues={selectedMaster?.field_values}
        activityFieldValues={fv}
      />
    );
  }
  if (name.includes('quiz')) {
    if (!selectedMaster) return <LeerHinweis text="Für dieses Mini-Quiz sind noch keine Fragen hinterlegt." />;
    return <TestBody key={selectedMaster.id} fieldValues={selectedMaster.field_values || {}} />;
  }
  if (name.includes('lückentext') || name.includes('lueckentext')) {
    if (!selectedMaster) return <LeerHinweis text="Für diesen Lückentext sind noch keine Aufgaben hinterlegt." />;
    return <LueckentextBody key={selectedMaster.id} fieldValues={selectedMaster.field_values || {}} />;
  }
  if (name.includes('begriffe zuordnen') || name.includes('zuordnen') || name.includes('match')) {
    if (!selectedMaster) return <LeerHinweis text="Für diese Aufgabe sind noch keine Begriffspaare hinterlegt." />;
    return <MatchTermsBody key={selectedMaster.id} fieldValues={selectedMaster.field_values || {}} />;
  }
  if (name === 'test' || name.includes('test')) {
    if (!selectedMaster) return <LeerHinweis text="Für diesen Test sind noch keine Fragen hinterlegt." />;
    return <TestBody key={selectedMaster.id} fieldValues={selectedMaster.field_values || {}} />;
  }
  if (name.includes('reihenfolge') || name.includes('sortier')) {
    if (!selectedMaster) return <LeerHinweis text="Für diese Sortieraufgabe sind noch keine Elemente hinterlegt." />;
    return <SortingListBody key={selectedMaster.id} fieldValues={selectedMaster.field_values || {}} />;
  }
  if (name.includes('bestätig') || name.includes('bestaetig') || name.includes('bearbeitung best')) {
    return <ConfirmationBody key={selectedMaster?.id || activity.id} fieldValues={(selectedMaster?.field_values) || fv} />;
  }
  if (name.includes('lehrwerk') || name.includes('quelle')) return <LehrwerkQuelleBody fieldValues={fv} />;
  if (name.includes('bildbeschriftung')) return <ImageLabelingBody fieldValues={fv} />;
  if (name.includes('offene')) return <OffeneBody fv={fv} />;
  return <DefaultBody fv={fv} />;
}

// Tab-Leiste zum Umschalten zwischen mehreren Master-Varianten einer Aktivität.
function MasterVariantTabs({ masters, selectedIdx, onSelect }) {
  if (!masters || masters.length <= 1) return null;
  return (
    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 shrink-0 overflow-x-auto">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">Varianten</span>
      {masters.map((m, i) => (
        <button
          key={m.id}
          onClick={() => onSelect(i)}
          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors shrink-0 ${
            i === selectedIdx
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          {m.titel || `Aufgabe ${i + 1}`}
        </button>
      ))}
    </div>
  );
}

// ─── Lernpaket-Intro-Slide ─────────────────────────────────────────────

function IntroSlide({ paket, lernziele }) {
  return (
    <div className="px-8 py-7 h-full overflow-y-auto">
      <div className="flex items-center gap-2 text-violet-700 text-[11px] font-bold uppercase tracking-wider mb-2">
        <BookOpen className="w-4 h-4" /> Lernpaket
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{paket?.titel_des_pakets}</h1>
      {paket?.geschaetzte_dauer_minuten && (
        <p className="text-sm text-slate-500 mb-5">⏱ ca. {paket.geschaetzte_dauer_minuten} Minuten</p>
      )}
      {lernziele.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Das lernst du hier</p>
          {lernziele.map(lz => (
            <div key={lz.id} className="flex items-start gap-2 p-3 rounded-lg border bg-emerald-50 border-emerald-200">
              <Target className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{lz.formulierung_fachsprache}</p>
                {lz.schueler_uebersetzung && (
                  <p className="text-xs text-slate-600 italic mt-0.5">„{lz.schueler_uebersetzung}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-slate-500 italic">Klicke links auf eine Aktivität, um sie zu öffnen.</p>
    </div>
  );
}

// ─── Hauptkomponente ───────────────────────────────────────────────────

export default function LernpaketPreviewModal({ open, onOpenChange, paket, aktivitaeten, katalog, masters, lernziele }) {
  const phaseOrder = ['Input', 'Übung', 'Abschluss'];
  const grouped = useMemo(() => {
    const phasenConfig = paket?.phasen_konfiguration || {};
    const out = {};
    for (const p of phaseOrder) {
      if ((phasenConfig[p] || {}).disabled === true) continue;
      out[p] = (aktivitaeten || [])
        .filter(a => a.phase === p)
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    }
    return out;
  }, [paket, aktivitaeten]);

  const allActivities = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? allActivities.find(a => a.id === selectedId) : null;
  const katalogName = selected ? katalog.find(k => k.id === selected.aktivitaet_id)?.name : null;
  const selectedMasters = selected ? (masters || []).filter(m => m.activity_id === selected.id) : [];

  // Pro Aktivität merken, welche Master-Variante gerade gezeigt wird.
  const [variantByActivity, setVariantByActivity] = useState({});
  const variantIdx = selected ? (variantByActivity[selected.id] || 0) : 0;
  const setVariantIdx = (idx) => {
    if (!selected) return;
    setVariantByActivity(prev => ({ ...prev, [selected.id]: idx }));
  };

  // Fortschritts-Andeutung: 0 von N erledigt (rein visuell)
  const totalCount = allActivities.length;
  const doneIdx = selected ? allActivities.findIndex(a => a.id === selected.id) : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau · Lernpaket
            <span className="text-xs font-normal text-slate-500 ml-1">· {paket?.titel_des_pakets}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            So sieht der Schüler dieses Lernpaket auf dem iPad. Klicke links in der Sidebar, um zwischen den Aktivitäten zu wechseln.
          </p>
        </DialogHeader>

        <div className="pt-3">
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
                  🔒 schule.moodle.de · {paket?.titel_des_pakets}
                </div>
              </div>

              {/* App-Header */}
              <div className="h-11 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center px-4 gap-3">
                <Home className="w-4 h-4 opacity-80" />
                <span className="text-sm font-semibold truncate">{paket?.titel_des_pakets}</span>
                {selected && (
                  <span className="ml-auto text-[11px] bg-white/15 px-2 py-0.5 rounded-full">{selected.phase}</span>
                )}
              </div>

              {/* Body: Sidebar + Slide */}
              <div className="flex bg-slate-100">
                {/* Dynamische Aktivitäts-Sidebar */}
                <aside className="w-[240px] bg-white border-r border-slate-200 p-3 space-y-3 overflow-y-auto" style={{ height: SLIDE_H + 32 }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold ${
                      !selected ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Übersicht
                  </button>

                  {Object.entries(grouped).map(([phase, list]) => (
                    <div key={phase} className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">{phase}</p>
                      {list.length === 0 && (
                        <p className="text-[11px] italic text-slate-400 px-1">—</p>
                      )}
                      {list.map((a, idx) => {
                        const name = katalog.find(k => k.id === a.aktivitaet_id)?.name || 'Aktivität';
                        const isActive = selected?.id === a.id;
                        const isDone = doneIdx >= 0 && allActivities.findIndex(x => x.id === a.id) < doneIdx;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelectedId(a.id)}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-[12px] ${
                              isActive ? 'bg-blue-600 text-white font-semibold'
                              : isDone ? 'text-slate-700 hover:bg-slate-50'
                              : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-white text-blue-600'
                              : isDone ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isDone ? '✓' : (idx + 1)}
                            </span>
                            <span className="truncate flex-1">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {totalCount > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 mb-1">
                        {Math.max(doneIdx, 0)} von {totalCount} angesehen
                      </p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(Math.max(doneIdx, 0) / totalCount) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </aside>

                {/* Inhalts-Slot */}
                <div className="p-4 bg-slate-100 flex items-center justify-center">
                  <div className="bg-white rounded-lg shadow-md ring-1 ring-slate-200 overflow-hidden flex flex-col"
                       style={{ width: SLIDE_W - 40, height: SLIDE_H }}>
                    {selected ? (
                      <>
                        <PhaseBar phase={selected.phase} />
                        <MasterVariantTabs masters={selectedMasters} selectedIdx={variantIdx} onSelect={setVariantIdx} />
                        <div className="flex-1 min-h-0 overflow-hidden">
                          {renderActivityBody(selected, katalogName, selectedMasters, variantIdx)}
                        </div>
                      </>
                    ) : (
                      <IntroSlide paket={paket} lernziele={lernziele || []} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}