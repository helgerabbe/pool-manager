import React from 'react';
import { Package, FileText, Trash2, X } from 'lucide-react';
import { GEWICHTE, gewichtVon, STUFEN } from '@/lib/kompetenzkarte';
import VerweisWahl from './VerweisWahl';

/** Eine Zeile der Kompetenzkarte: Text, Gewichtung, Verweise und die vier Einschätzungs-Kästchen. */
export default function KompetenzZeile({ k, verweise, onChange, onDelete }) {
  const g = gewichtVon(k.gewicht);
  const setze = (feld, wert) => onChange({ ...k, [feld]: wert });
  return (
    <div className="grid grid-cols-[1fr_repeat(4,5.5rem)] border-t">
      <div className={`space-y-1.5 border-l-4 px-3 py-2 ${g.zeile}`}>
        <textarea rows={1} value={k.text} onChange={(e) => setze('text', e.target.value)} placeholder="… was der Schüler können soll."
          className="w-full resize-none bg-transparent text-sm font-semibold outline-none [field-sizing:content]" />
        <div className="flex flex-wrap items-center gap-1">
          {GEWICHTE.map((x) => (
            <button key={x.key} type="button" onClick={() => setze('gewicht', x.key)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${x.key === g.key ? x.chip : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
              {x.label}
            </button>
          ))}
          <span className="mx-1 h-3 w-px bg-border" />
          {(k.verweise || []).map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5 text-[11px] ring-1 ring-border">
              {v.art === 'lernpaket' ? <Package className="h-3 w-3 text-primary" /> : <FileText className="h-3 w-3 text-muted-foreground" />}
              {v.titel}
              <button type="button" onClick={() => setze('verweise', k.verweise.filter((x) => x.id !== v.id))}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <VerweisWahl gewaehlt={k.verweise} verweise={verweise} onChange={(neu) => setze('verweise', neu)} />
          <button type="button" onClick={onDelete} title="Kompetenz entfernen" className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {STUFEN.map((s) => (
        <div key={s} className="flex items-center justify-center border-l"><span className="h-4 w-4 rounded-sm border-2 border-foreground/50" /></div>
      ))}
    </div>
  );
}