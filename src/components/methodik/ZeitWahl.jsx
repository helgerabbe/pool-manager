import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const KATEGORIEN = [['kurz', 0, 5], ['normal', 5, 10], ['lang', 10, 20], ['sehr lang', 20, 30]];
export const zeitKategorie = (m = 0) => KATEGORIEN.find(([, , bis]) => m <= bis) || KATEGORIEN[3];

/** Zeit-Plakette einer Phase: Tooltip mit Zeitspanne, Klick öffnet die grobe Einstellung (immer mind. 5 Min. Spanne). */
export default function ZeitWahl({ phase, onSpeichern }) {
  const [name, von0, bis0] = zeitKategorie(phase.minuten);
  const eigen = phase.zeitspanne;
  const [wert, setWert] = React.useState(eigen || [von0, bis0]);
  const [offen, setOffen] = React.useState(false);
  const text = eigen ? `${eigen[0]}–${eigen[1]} Min.` : name;
  const spanne = eigen ? 'von dir eingestellt' : `ca. ${von0}–${bis0} Min.`;

  return (
    <Popover open={offen} onOpenChange={(o) => { setOffen(o); if (o) setWert(eigen || [von0, bis0]); }}>
      <TooltipProvider><Tooltip><TooltipTrigger asChild>
        <PopoverTrigger asChild>
          <button className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium hover:ring-1 hover:ring-chart-3 ${eigen ? 'bg-chart-3 text-primary-foreground' : 'bg-chart-3/15 text-chart-3'}`}>
            <Clock className="h-3 w-3" /> {text}
          </button>
        </PopoverTrigger>
      </TooltipTrigger><TooltipContent>{spanne} · Klicken zum Einstellen</TooltipContent></Tooltip></TooltipProvider>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-semibold">Wie lange ungefähr?</p>
        <p className="text-xs text-muted-foreground">Bisher geplant: {name} (ca. {von0}–{bis0} Min.)</p>
        <Slider min={0} max={30} step={5} minStepsBetweenThumbs={1} value={wert} onValueChange={setWert} />
        <p className="text-center text-sm font-medium">{wert[0]}–{wert[1]} Minuten</p>
        <div className="flex justify-end gap-2">
          {eigen && <Button size="sm" variant="ghost" onClick={() => { onSpeichern(null); setOffen(false); }}>Zurücksetzen</Button>}
          <Button size="sm" onClick={() => { onSpeichern(wert); setOffen(false); }}>Übernehmen</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}