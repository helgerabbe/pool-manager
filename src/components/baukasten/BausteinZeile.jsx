import React from 'react';
import { GripVertical, Trash2, Maximize2, Check, X, Clock } from 'lucide-react';
import { ARTEN, hatMethode } from '@/lib/stundenbaukasten';
import FolieHinzuButton from './FolieHinzuButton';
import FolienStreifen from './FolienStreifen';

/** Eine Zeile der Zeitleiste: Kopf (Art, Titel, Richtwert) + horizontaler Folienstreifen. */
export default function BausteinZeile({ b, nr, kopf, griff, onOeffnen, onEntfernen, vorschlag, onUebernehmen, onFolieHinzu }) {
  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-sm transition ${vorschlag ? 'border-dashed border-primary/50 bg-primary/[0.03]' : ''}`}>
      <div className="mb-3 flex items-center gap-3">
        {griff ? <span {...griff} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></span> : null}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{nr}</span>
        {hatMethode(b) && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ARTEN.methode.farbe}`}>Methode</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold">{b.titel || 'Ohne Titel'}{hatMethode(b) && b.methode !== b.titel ? <span className="font-normal text-muted-foreground"> · {b.methode}</span> : ''}</p>
          {b.beschreibung && <p className="truncate text-xs text-muted-foreground">{b.beschreibung}</p>}
        </div>
        <span className="text-[11px] text-muted-foreground">{b.geraet === 'geraet' ? 'Am Gerät' : 'Nur Tafel'}</span>
        {b.minuten > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />ca. {b.minuten}′</span>}
        {vorschlag ? (
          <>
            <button onClick={() => onUebernehmen(true)} className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"><Check className="h-3 w-3" /> Übernehmen</button>
            <button onClick={() => onUebernehmen(false)} className="rounded-md border p-1 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </>
        ) : (
          <>
            {onFolieHinzu && <FolieHinzuButton onFolie={onFolieHinzu} />}
            <button onClick={() => onOeffnen(0)} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:border-primary hover:text-primary"><Maximize2 className="h-3 w-3" /> Öffnen</button>
            <button onClick={onEntfernen} className="rounded-md p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
      </div>
      <FolienStreifen folien={b.folien} kopf={kopf} onFolie={vorschlag ? () => {} : onOeffnen} />
    </div>
  );
}