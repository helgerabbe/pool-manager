import React from 'react';
import { CI_GRUND, CI_ERGEBNIS as E, CI_INTERAKTIV } from '@/lib/folienCI';

const STIMMEN = [{ l: 'Arbeit', w: 12 }, { l: 'Bildung', w: 7 }, { l: 'Freizeit', w: 4 }];
const WORTE = [['Arbeit', 26], ['Schule', 18], ['Ärzte', 14], ['Kino', 12], ['Freunde', 16]];

/** Vorschau Teil 9: Ergebnisanzeigen an der Tafel. */
export default function CiErgebnisVorschau() {
  const max = Math.max(...STIMMEN.map((s) => s.w));
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><p className="text-xs font-semibold">{E.arten.balken.name}</p>
          {STIMMEN.map((s, i) => (
            <div key={s.l} className="text-xs"><div className="flex justify-between"><span>{s.l}</span><span className={s.w === max ? 'font-bold' : ''}>{s.w}</span></div>
              <div className="h-3 rounded-full bg-white"><div className="h-3 rounded-full" style={{ width: `${(s.w / max) * 100}%`, background: s.w === max ? E.hervorhebung : E.reihe[i] }} /></div></div>
          ))}
        </div>
        <div><p className="mb-2 text-xs font-semibold">{E.arten.wolke.name}</p>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3">{WORTE.map(([w, g], i) => <span key={w} style={{ fontSize: g, color: i === 0 ? E.hervorhebung : '#4B5565' }}>{w}</span>)}</div>
        </div>
        <div><p className="mb-2 text-xs font-semibold">{E.arten.pinnwand.name}</p>
          <div className="grid grid-cols-2 gap-2">{['Mehr Jobs', 'Uni', 'Busse', 'Kultur'].map((t) => <div key={t} className="rounded-md border p-2 text-xs" style={{ background: CI_INTERAKTIV.notiz.hg, borderColor: CI_INTERAKTIV.notiz.rand }}>{t}</div>)}</div>
          <p className="mt-2 text-xs">18 von 24 fertig</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{E.regel}</p>
    </div>
  );
}