import React from 'react';
import { ChevronLeft, ChevronRight, Maximize, Play, StickyNote, Tablet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Steuerleiste des Lehrer-Players (unten). */
export default function PlayerLeiste({ index, anzahl, phase, laeuft, onZurueck, onWeiter, onStart, onSchueler, onRegie, onBeenden }) {
  const knopf = 'gap-1.5 bg-white/10 text-white hover:bg-white/20';
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/40 px-4 py-2">
      <Button size="sm" variant="ghost" className={knopf} disabled={index === 0} onClick={onZurueck}><ChevronLeft className="h-4 w-4" /></Button>
      <span className="text-sm text-white/80">{index + 1} / {anzahl} · {phase.phasenname}</span>
      <Button size="sm" variant="ghost" className={knopf} disabled={index === anzahl - 1} onClick={onWeiter}><ChevronRight className="h-4 w-4" /></Button>
      <div className="ml-auto flex flex-wrap gap-2">
        {!laeuft && (
          <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={onStart}>
            <Play className="h-4 w-4" /> {phase.freischalt_code && !phase.code_deaktiviert ? 'Code zeigen & Zeit starten' : 'Zeit starten'}
          </Button>
        )}
        <Button size="sm" variant="ghost" className={knopf} onClick={onSchueler}><Tablet className="h-4 w-4" /> Schüleransicht zeigen</Button>
        <Button size="sm" variant="ghost" className={knopf} onClick={onRegie}><StickyNote className="h-4 w-4" /> Regie</Button>
        <Button size="sm" variant="ghost" className={knopf} onClick={() => document.documentElement.requestFullscreen?.()}><Maximize className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" className={knopf} onClick={onBeenden}><X className="h-4 w-4" /> Beenden</Button>
      </div>
    </div>
  );
}