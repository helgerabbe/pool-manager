/**
 * FolienListe.jsx
 *
 * Linke Spalte des Slideshow-Editors: Folien-Thumbnails mit Auswahl,
 * Verschieben, Löschen und „Folie hinzufügen".
 */
import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';
import { cn } from '@/lib/utils';

export default function FolienListe({ folien, aktuell, onSelect, onAdd, onDelete, onMove }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-3 py-2 border-b">
        <Button size="sm" variant="outline" onClick={onAdd} className="w-full gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Folie hinzufügen
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {folien.map((f, i) => (
          <div
            key={f.id}
            onClick={() => onSelect(i)}
            className={cn(
              'group relative rounded-lg border p-1.5 cursor-pointer transition-colors',
              i === aktuell ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
            )}
          >
            <div className="flex items-start gap-1.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 pointer-events-none">
                <SlideScaler className="rounded border border-border">
                  <SlideCanvas folie={f} modus="view" />
                </SlideScaler>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={(e) => { e.stopPropagation(); onMove(i, i - 1); }} disabled={i === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach oben">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onMove(i, i + 1); }} disabled={i === folien.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach unten">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(i); }} className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600" title="Folie entfernen">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}