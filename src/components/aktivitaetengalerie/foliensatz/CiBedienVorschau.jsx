import React from 'react';
import { Check, SearchCheck, X, RotateCcw, ArrowRight, Lock } from 'lucide-react';

const SYMBOLE = { Check, SearchCheck, X, RotateCcw, ArrowRight, Lock };
import { CI_GRUND, CI_BUTTONS, CI_EINGABE } from '@/lib/folienCI';

const btn = (b) => ({ background: b.hg, color: b.text, borderColor: b.rand });

/** Vorschau Teil 2: Buttons und Eingabefelder (statisch). */
export default function CiBedienVorschau() {
  const e = CI_EINGABE;
  return (
    <div className="space-y-4 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      <div className="flex flex-wrap gap-3">
        {Object.entries(CI_BUTTONS).map(([k, b]) => (
          <div key={k} className="space-y-1">
            <span className={`inline-flex items-center gap-2 rounded-xl border-2 px-5 py-2 text-sm font-semibold ${b.gesperrt ? 'cursor-not-allowed border-dashed' : ''}`} style={btn(b)}>
              {SYMBOLE[b.symbol] && React.createElement(SYMBOLE[b.symbol], { className: 'h-4 w-4' })}{b.label}
            </span>
            <p className="text-xs text-muted-foreground">{b.name}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[['Normal', e.feld.rand, 'transparent', ''], ['Beim Schreiben', e.fokus.rand, e.fokus.schein, 'Mein Gedanke …']].map(([l, rand, schein, wert]) => (
          <div key={l} className="space-y-1">
            <p className="text-xs font-semibold" style={{ color: e.label.text }}>Deine Antwort · {l}</p>
            <div className="rounded-xl border-2 px-3 py-2 text-sm" style={{ background: e.feld.hg, borderColor: rand, boxShadow: `0 0 0 4px ${schein}`, color: wert ? e.feld.text : e.feld.platzhalter }}>
              {wert || 'Schreibe hier …'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}