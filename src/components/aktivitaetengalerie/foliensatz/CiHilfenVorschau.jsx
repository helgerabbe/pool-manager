import React, { useState } from 'react';
import { Lightbulb, Bot, Send } from 'lucide-react';
import { CI_GRUND, CI_HILFEN } from '@/lib/folienCI';

const TIPPS = ['Denk an die Gründe, warum Menschen umziehen.', 'Vergleiche Arbeitsplätze in Stadt und Land.'];

/** Vorschau: Tippkarte (gestuft) und KI-Tutor als Lernunterstützung. */
export default function CiHilfenVorschau() {
  const [stufe, setStufe] = useState(0);
  const { tipp: t, tutor: k } = CI_HILFEN;
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border p-3" style={{ background: t.hg, borderColor: t.rand, color: t.text }}>
          <p className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4" />{t.titel}</p>
          {TIPPS.slice(0, stufe).map((s, i) => <p key={i} className="text-xs">{i + 1}. {s}</p>)}
          {stufe < TIPPS.length && <button onClick={() => setStufe(stufe + 1)} className="rounded-lg border bg-white px-3 py-1 text-xs" style={{ borderColor: t.rand }}>{stufe ? 'Noch ein Tipp' : t.knopf}</button>}
          <p className="text-[10px] opacity-70">{t.stufen}</p>
        </div>
        <div className="space-y-2 rounded-xl border p-3" style={{ background: k.hg, borderColor: k.rand, color: k.text }}>
          <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4" />{k.titel}</p>
          <p className="w-fit max-w-[85%] rounded-xl bg-white px-3 py-1.5 text-xs">Was glaubst du, warum ziehen junge Leute eher weg?</p>
          <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-xs text-muted-foreground">{k.knopf} …<Send className="ml-auto h-3 w-3" /></div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{k.regel}</p>
    </div>
  );
}