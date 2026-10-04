import React from 'react';
import { Puzzle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Digitaler Baustein aus dem Aktivitätenkatalog für eine Phase. */
export default function KatalogBausteinWahl({ auswahl = [], wert, onWahl }) {
  if (!auswahl.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-primary/5 px-2 py-1.5 text-xs">
      <Puzzle className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">Digitaler Baustein:</span>
      <Select value={wert || undefined} onValueChange={onWahl}>
        <SelectTrigger className="h-7 w-auto min-w-[200px] text-xs"><SelectValue placeholder="Baustein wählen" /></SelectTrigger>
        <SelectContent>
          {auswahl.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}