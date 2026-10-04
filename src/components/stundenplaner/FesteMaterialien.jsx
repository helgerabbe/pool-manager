import React from 'react';
import { Paperclip, Globe, GripVertical, X } from 'lucide-react';

/** Feste Materialien – per Drag & Drop einer Phase zuordnen. */
export default function FesteMaterialien({ materialien, onLoesen }) {
  if (!materialien?.length) return null;
  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
      <p className="text-sm font-semibold">Diese Materialien verwenden wir auf jeden Fall</p>
      <p className="text-xs text-muted-foreground">Zieh ein Material auf die Phase, in der es eingesetzt wird.</p>
      <ul className="mt-2 space-y-1.5">
        {materialien.map((m, i) => (
          <li key={i} draggable onDragStart={(e) => e.dataTransfer.setData('text/material', String(i))}
            className="flex cursor-grab items-center gap-2 rounded-md bg-card px-2 py-1 text-sm active:cursor-grabbing">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            {m.herkunft === 'internet' ? <Globe className="h-4 w-4 shrink-0 text-primary" /> : <Paperclip className="h-4 w-4 shrink-0 text-accent" />}
            <span className="flex-1">{m.name}</span>
            {m.phase
              ? <span className="flex items-center gap-1 text-xs text-muted-foreground">· {m.phase}<button onClick={() => onLoesen(i)}><X className="h-3 w-3" /></button></span>
              : <span className="text-xs text-accent">noch keiner Phase zugeordnet</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Hochgeladene Dateien gehen beim Anlegen mit in ihre Phase.</p>
    </div>
  );
}