import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import IdeenkistePanel from './IdeenkistePanel';

/**
 * Einheitenweiter Zugang zur Aufgaben-Sammelbox ("Ideenkiste").
 * Zeigt die Anzahl offener Aufgaben-Ideen als Zähler und öffnet das Panel.
 */
export default function IdeenkisteButton({ einheitId, einheit = null, kannBearbeiten = true }) {
  const [open, setOpen] = useState(false);
  const { data: ideen = [] } = useQuery({
    queryKey: ['aufgaben-ideen', einheitId],
    queryFn: () => base44.entities.AufgabenIdee.filter({ einheit_id: einheitId }, '-updated_date'),
    enabled: !!einheitId,
  });
  const offeneAnzahl = ideen.filter((i) => i.status !== 'integriert').length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ideenkiste: Aufgaben-Ideen sammeln, bevor klar ist, wo sie in der Einheit hingehören"
        className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        Ideenkiste
        {offeneAnzahl > 0 && (
          <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {offeneAnzahl}
          </span>
        )}
      </button>
      <IdeenkistePanel
        open={open}
        onOpenChange={setOpen}
        einheitId={einheitId}
        einheit={einheit}
        ideen={ideen}
        kannBearbeiten={kannBearbeiten}
      />
    </>
  );
}