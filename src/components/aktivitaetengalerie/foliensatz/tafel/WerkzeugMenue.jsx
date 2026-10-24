import React from 'react';
import { Menu } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { werkzeugeFuer } from '@/lib/tafelWerkzeuge';

/** Burger-Menü oben links: Die Lehrkraft blendet Anzeigen der Tafel ein und aus. */
export default function WerkzeugMenue({ sozialform, an, setAn }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title="Anzeigen wählen" className="flex h-7 w-7 items-center justify-center rounded-md border bg-white text-[#2A4074]"><Menu className="h-4 w-4" /></button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="mb-1 px-1 text-xs font-semibold text-muted-foreground">Was soll die Tafel zeigen?</p>
        {werkzeugeFuer(sozialform).map((w) => (
          <label key={w.key} className="flex cursor-pointer items-center justify-between rounded px-1 py-1.5 text-sm hover:bg-muted">
            {w.name}
            <Switch checked={!!an[w.key]} onCheckedChange={(v) => setAn({ ...an, [w.key]: v })} />
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}