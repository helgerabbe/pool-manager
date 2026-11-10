import React from 'react';
import { BookOpen } from 'lucide-react';
import { STUFEN, sortiert, gewichtVon } from '@/lib/kompetenzkarte';

/** Ein Bereich der Kompetenzkarte, wie ihn der Schüler sieht: zum Ankreuzen (nur Vorschau, nichts wird gespeichert). */
export default function SchuelerBereich({ bereich, wahl, onWahl }) {
  return (
    <div className="overflow-hidden rounded-lg border-2 border-foreground/70 bg-card">
      <div className="grid grid-cols-[1fr_repeat(4,5.5rem)] bg-muted">
        <div className="px-3 py-2">
          <p className="font-bold">{bereich.titel}</p>
          <p className="text-xs text-muted-foreground">Du kannst …</p>
        </div>
        {STUFEN.map((s) => <div key={s} className="flex items-center justify-center border-l px-1 text-center text-[10px] leading-tight">{s}</div>)}
      </div>
      {sortiert(bereich.kompetenzen).map((k) => (
        <div key={k.id} className="grid grid-cols-[1fr_repeat(4,5.5rem)] border-t">
          <div className={`border-l-4 px-3 py-2 ${gewichtVon(k.gewicht).zeile}`}>
            <p className="text-sm font-semibold">{k.text}</p>
            {!!k.verweise?.length && (
              <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <BookOpen className="h-3 w-3" /> Hier lernst du das: {k.verweise.map((v) => v.titel).join(' · ')}
              </p>
            )}
          </div>
          {STUFEN.map((s, i) => (
            <button key={s} type="button" onClick={() => onWahl(k.id, i)} title={s} className="flex items-center justify-center border-l hover:bg-muted">
              <span className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 text-[10px] font-bold ${wahl[k.id] === i ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/50'}`}>
                {wahl[k.id] === i ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}