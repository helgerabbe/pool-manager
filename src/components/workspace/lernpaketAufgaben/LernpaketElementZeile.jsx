import React from 'react';
import { Pencil, PencilRuler, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Ein Element im Wissensspeicher oder Abschluss eines Lernpakets, gleich aufgebaut wie eine Aufgabenzeile. */
export default function LernpaketElementZeile({ activity, name, farbe, loeschbar, pfeile, onOeffnen, onLoeschen }) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap rounded-md border px-3 py-2', farbe)}>
      {pfeile}
      <button type="button" onClick={onOeffnen} className="flex-1 min-w-[160px] text-left">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className={cn('text-[11px]', activity.is_complete ? 'text-muted-foreground' : 'text-amber-700')}>
          {activity.is_complete ? 'Vollständig' : 'Noch unvollständig'}
        </div>
      </button>
      {activity.braucht_nacharbeit === true && (
        <span
          title={activity.nacharbeit_notiz || 'Für Nacharbeit vorgemerkt'}
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300"
        >
          <PencilRuler className="w-2.5 h-2.5" />Nacharbeit
        </span>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onOeffnen} title="Bearbeiten">
        <Pencil />
      </Button>
      {loeschbar && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onLoeschen} title="Löschen">
          <Trash2 />
        </Button>
      )}
    </div>
  );
}