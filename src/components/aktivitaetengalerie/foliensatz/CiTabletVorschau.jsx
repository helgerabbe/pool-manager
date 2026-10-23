import React, { useState } from 'react';
import { ChevronLeft, Lightbulb, Bot, ArrowRight } from 'lucide-react';
import { CI_GRUND, CI_TABLET, CI_BOXEN, CI_BUTTONS, CI_METHODE_ANZEIGE } from '@/lib/folienCI';

/** Vorschau Teil 13: Schüleransicht auf dem iPad 11" mit iPadOS-Navigation. */
export default function CiTabletVorschau() {
  const [hoch, setHoch] = useState(false);
  const [seg, setSeg] = useState('Aufgabe');
  const m = hoch ? CI_TABLET.hoch : CI_TABLET.quer;
  const b = CI_BUTTONS.weiter;
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex gap-2">
        {['Querformat', 'Hochformat'].map((l, i) => (
          <button key={l} onClick={() => setHoch(i === 1)} className={`rounded-full border px-3 py-1 text-xs ${hoch === (i === 1) ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{l}</button>
        ))}
      </div>
      <div className="mx-auto rounded-[28px] bg-neutral-800 p-3" style={{ width: hoch ? 300 : 520 }}>
        <div className="flex flex-col overflow-hidden rounded-[18px]" style={{ aspectRatio: `${m.breite} / ${m.hoehe}`, background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <div className="flex justify-between px-3 py-0.5 text-[8px]"><span>9:41</span><span>100 %</span></div>
          <div className="flex items-center border-b bg-white/80 px-2 py-1.5 text-[10px]">
            <span className="flex items-center text-[#3E5C8A]"><ChevronLeft className="h-3.5 w-3.5" />Zurück</span>
            <span className="flex-1 text-center font-semibold" style={{ color: CI_METHODE_ANZEIGE.text }}>{CI_METHODE_ANZEIGE.beispiel} · {CI_METHODE_ANZEIGE.schritt}</span>
            <span className="flex gap-2 text-[#3E5C8A]"><Lightbulb className="h-3.5 w-3.5" /><Bot className="h-3.5 w-3.5" /></span>
          </div>
          <div className="mx-auto mt-2 flex rounded-lg bg-neutral-200 p-0.5 text-[9px]">
            {['Aufgabe', 'Material'].map((s) => <button key={s} onClick={() => setSeg(s)} className={`rounded-md px-3 py-0.5 ${seg === s ? 'bg-white shadow-sm' : ''}`}>{s}</button>)}
          </div>
          <div className="m-3 flex-1 rounded-lg border p-2 text-[10px]" style={{ background: CI_BOXEN.aufgabe.hg, borderColor: CI_BOXEN.aufgabe.rand, color: CI_BOXEN.aufgabe.text }}>
            <b>{seg}</b><p>{seg === 'Aufgabe' ? 'Notiere zwei Gründe, warum Menschen in die Stadt ziehen.' : 'Text: Leben in der Großstadt'}</p>
          </div>
          <div className="flex justify-center pb-1"><span className="flex items-center gap-1 rounded-lg px-4 py-1 text-[10px] font-semibold" style={{ background: b.hg, color: b.text }}>{b.label}<ArrowRight className="h-3 w-3" /></span></div>
          <div className="mx-auto mb-1 h-1 w-16 rounded-full bg-neutral-800" />
        </div>
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs">{CI_TABLET.regeln.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}