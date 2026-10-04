import React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import TafelBildBlock from './TafelBildBlock';

/** Ein Baustein auf der Tafel – direkt auf der Tafel bearbeitbar. */
export default function TafelBlock({ block, onChange, onHoch, onRunter, onLoeschen }) {
  return (
    <div className="group relative rounded-md px-2 py-1 hover:ring-1 hover:ring-white/30">
      {block.typ === 'ueberschrift' && (
        <input
          value={block.inhalt || ''}
          onChange={(e) => onChange({ inhalt: e.target.value })}
          placeholder="Überschrift"
          className="w-full bg-transparent text-center font-display text-3xl font-bold text-white outline-none placeholder:text-white/40"
        />
      )}
      {block.typ === 'text' && (
        <textarea
          rows={Math.max(2, (block.inhalt || '').split('\n').length)}
          value={block.inhalt || ''}
          onChange={(e) => onChange({ inhalt: e.target.value })}
          placeholder="Text für die Tafel …"
          className="w-full resize-none bg-transparent text-center text-xl text-white outline-none placeholder:text-white/40"
        />
      )}
      {block.typ === 'bild' && <TafelBildBlock block={block} onChange={onChange} />}
      <div className="absolute -right-1 top-1 hidden gap-1 group-hover:flex">
        {[[ArrowUp, onHoch], [ArrowDown, onRunter], [Trash2, onLoeschen]].map(([Icon, fn], i) => (
          <button key={i} onClick={fn} className="rounded bg-white/15 p-1 text-white hover:bg-white/30"><Icon className="h-3.5 w-3.5" /></button>
        ))}
      </div>
    </div>
  );
}