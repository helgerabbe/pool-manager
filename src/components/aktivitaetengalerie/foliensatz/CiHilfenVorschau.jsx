import React, { useState } from 'react';
import { Lightbulb, Bot, Send, X } from 'lucide-react';
import { CI_GRUND, CI_HILFEN } from '@/lib/folienCI';

const TIPPS = ['Denk an Arbeit und Ausbildung.', 'Was bietet eine Stadt, was ein Dorf nicht hat?', 'Lösungsweg: Gründe sammeln, dann ordnen.'];

/** Vorschau Teil 8b: Hilfen als kleine Symbolknöpfe, die ein Blatt öffnen. */
export default function CiHilfenVorschau() {
  const [offen, setOffen] = useState(null);
  const [stufe, setStufe] = useState(1);
  const { tipp, tutor } = CI_HILFEN;
  const knopf = (k, h, Icon) => (
    <button onClick={() => setOffen(offen === k ? null : k)} title={h.titel} className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ background: h.hg, color: h.text, borderColor: h.rand }}><Icon className="h-4 w-4" /></button>
  );
  const h = offen === 'tipp' ? tipp : tutor;
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex gap-2">{knopf('tipp', tipp, Lightbulb)}{knopf('tutor', tutor, Bot)}</div>
      {offen && (
        <div className="max-w-sm rounded-xl border p-3 text-xs" style={{ background: h.hg, borderColor: h.rand, color: h.text }}>
          <div className="mb-2 flex items-center justify-between font-semibold">{h.titel}<button onClick={() => setOffen(null)}><X className="h-3.5 w-3.5" /></button></div>
          {offen === 'tipp' ? (
            <>
              {TIPPS.slice(0, stufe).map((t, i) => <p key={i} className="mb-1">{i + 1}. {t}</p>)}
              {stufe < TIPPS.length && <button onClick={() => setStufe(stufe + 1)} className="mt-1 rounded-full border bg-white px-2 py-0.5" style={{ borderColor: h.rand }}>Nächster Tipp</button>}
            </>
          ) : (
            <>
              <p className="mb-2 rounded-lg bg-white px-2 py-1">Was glaubst du, warum ziehen junge Leute eher weg?</p>
              <div className="flex items-center rounded-full bg-white px-2 py-1 text-muted-foreground">Frag den Tutor …<Send className="ml-auto h-3 w-3" /></div>
            </>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Tipp und Tutor sind nur kleine runde Symbole in der Leiste oben. Ein Tippen öffnet ein kleines Blatt, ein erneutes Tippen oder das X schließt es. {tutor.regel}</p>
    </div>
  );
}