import React, { useState } from 'react';
import { ChevronLeft, Lightbulb, Bot, ArrowRight, Users, SearchCheck, LayoutList } from 'lucide-react';
import { CI_GRUND, CI_TABLET, CI_BOXEN, CI_BUTTONS, CI_METHODE_ANZEIGE, CI_TIMER, CI_SYMBOL_STIL, CI_GRUPPEN, CI_FOLIENTYPEN } from '@/lib/folienCI';

const kreis = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full';
const sym = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Vorschau Teil 13: Schüleransicht auf dem iPad 11" – eine schmale Leiste, Inhalt auf voller Fläche. */
export default function CiTabletVorschau() {
  const [hoch, setHoch] = useState(false);
  const [seg, setSeg] = useState('Aufgabe');
  const [nav, setNav] = useState(false);
  const [info, setInfo] = useState(false);
  const m = hoch ? CI_TABLET.hoch : CI_TABLET.quer;
  const g = CI_GRUPPEN[1];
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex gap-2">
        {['Querformat', 'Hochformat'].map((l, i) => (
          <button key={l} onClick={() => setHoch(i === 1)} className={`rounded-full border px-3 py-1 text-xs ${hoch === (i === 1) ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{l}</button>
        ))}
      </div>
      <div className="mx-auto rounded-[28px] bg-neutral-800 p-3" style={{ width: hoch ? 320 : 560 }}>
        <div className="relative flex flex-col overflow-hidden rounded-[18px]" style={{ aspectRatio: `${m.breite} / ${m.hoehe}`, background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full" style={{ background: CI_FOLIENTYPEN.aufgabe.farbe }} />
          <div className="relative flex justify-between px-3 pt-0.5 text-[8px]"><span>9:41</span><span>100 %</span></div>
          <div className="relative flex flex-wrap items-center gap-2 px-2 py-1 text-[9px]">
            <span className="flex items-center text-[#3E5C8A]"><ChevronLeft className="h-3.5 w-3.5" />Zurück</span>
            <div className="relative">
              <button onClick={() => setNav(!nav)} className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5"><LayoutList className="h-3 w-3" />{seg}</button>
              {nav && (
                <div className="absolute left-0 top-full z-10 mt-1 w-24 rounded-lg bg-white p-1 shadow">
                  {['Aufgabe', 'Material'].map((s) => <button key={s} onClick={() => { setSeg(s); setNav(false); }} className={`block w-full rounded px-2 py-0.5 text-left ${seg === s ? 'bg-[#E3EEF9]' : ''}`}>{s}</button>)}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setInfo(!info)} className="rounded-full px-2 py-0.5 font-semibold" style={{ background: CI_METHODE_ANZEIGE.hg, color: CI_METHODE_ANZEIGE.text }}>{CI_METHODE_ANZEIGE.beispiel} · {CI_METHODE_ANZEIGE.schritt}</button>
              {info && <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg p-2 shadow" style={{ background: CI_METHODE_ANZEIGE.hg, color: CI_METHODE_ANZEIGE.text }}>{CI_METHODE_ANZEIGE.erklaerung}</div>}
            </div>
            <span className="ml-auto flex items-center gap-1">
              <span className="rounded-full px-1.5 font-semibold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text }}>4:30</span>
              <span className={kreis} style={sym}><Users className="h-3 w-3" /></span>
              <span className={`${kreis} font-bold`} style={{ background: g.hg, color: g.text }}>{g.kennung}</span>
              <span className={kreis} style={sym}><Lightbulb className="h-3 w-3" /></span>
              <span className={kreis} style={sym}><Bot className="h-3 w-3" /></span>
            </span>
          </div>
          <div className="relative mx-2 mb-2 flex-1 rounded-lg border bg-white/80 p-2 text-[10px]" style={{ borderColor: CI_BOXEN.aufgabe.rand }}>
            <b style={{ color: CI_BOXEN.aufgabe.text }}>{seg}</b>
            <p>{seg === 'Aufgabe' ? 'Notiere zwei Gründe, warum Menschen in die Stadt ziehen.' : 'Text: Leben in der Großstadt'}</p>
            <div className="absolute bottom-1.5 right-1.5 flex gap-1">
              <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold" style={{ background: CI_BUTTONS.pruefen.hg, color: CI_BUTTONS.pruefen.text, borderColor: CI_BUTTONS.pruefen.rand }}><SearchCheck className="h-3 w-3" />Prüfen</span>
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold shadow" style={{ background: CI_BUTTONS.weiter.hg, color: CI_BUTTONS.weiter.text }}>Weiter<ArrowRight className="h-3 w-3" /></span>
            </div>
          </div>
          <div className="mx-auto mb-1 h-1 w-16 rounded-full bg-neutral-800" />
        </div>
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs">{[...CI_TABLET.regeln, CI_METHODE_ANZEIGE.regel].map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}