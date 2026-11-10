import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SegmentWahl from './SegmentWahl';
import { NIVEAUS, NIVEAU_STANDARD, PFLICHT_WAHL } from '@/lib/aufgabenNiveau';

/** Eine Aufgabe im Teil „Aufgaben" eines Lernpakets. */
export default function LernpaketAufgabeZeile({ aufgabe, nummer, editierbar, onAendern, onOeffnen, onLoeschen }) {
  const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte.length : 0;
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-md border border-border bg-card px-3 py-2">
      <button type="button" onClick={onOeffnen} className="flex-1 min-w-[160px] text-left">
        <div className="text-sm font-semibold text-foreground">
          Aufgabe {nummer}
          {aufgabe.titel?.trim() && <span className="font-normal">: {aufgabe.titel}</span>}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {schritte === 0 ? 'Noch keine Elemente' : `${schritte} ${schritte === 1 ? 'Element' : 'Elemente'}`}
        </div>
      </button>
      <SegmentWahl
        optionen={NIVEAUS}
        value={aufgabe.niveau || NIVEAU_STANDARD}
        onChange={(niveau) => onAendern({ niveau })}
        disabled={!editierbar}
      />
      <SegmentWahl
        optionen={PFLICHT_WAHL}
        value={aufgabe.pflicht !== false}
        onChange={(pflicht) => onAendern({ pflicht })}
        disabled={!editierbar}
      />
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onOeffnen} title="In der Werkstatt öffnen">
        <Pencil />
      </Button>
      {editierbar && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onLoeschen} title="Aufgabe löschen">
          <Trash2 />
        </Button>
      )}
    </div>
  );
}