import React from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

const SPANNEN = [[0, 5], [5, 10], [10, 15], [15, 20], [20, 30]];

/** Zeitangabe eines Blocks: Klick öffnet Auswahl aus Zeitfenstern, Schieberegler (von–bis) oder exakter Minutenzahl. */
export const zeitText = (b) => (b.zeit_von != null && b.zeit_bis != null ? `${b.zeit_von}–${b.zeit_bis}′` : b.minuten > 0 ? `ca. ${b.minuten}′` : 'Zeit');

export default function ZeitPopover({ b, onZeit }) {
  const [spanne, setSpanne] = React.useState([b.zeit_von ?? 5, b.zeit_bis ?? 10]);
  const fenster = ([von, bis]) => onZeit({ zeit_von: von, zeit_bis: bis, minuten: Math.round((von + bis) / 2) });
  const exakt = (m) => onZeit({ zeit_von: null, zeit_bis: null, minuten: Math.max(0, Number(m) || 0) });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Clock className="h-3 w-3" />{zeitText(b)}</button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Zeitfenster</p>
          <div className="flex flex-wrap gap-1.5">
            {SPANNEN.map((s) => (
              <button key={s.join()} onClick={() => { setSpanne(s); fenster(s); }}
                className={`rounded-full border px-2.5 py-1 text-xs hover:border-primary ${b.zeit_von === s[0] && b.zeit_bis === s[1] ? 'border-primary bg-primary text-primary-foreground' : ''}`}>{s[0]}–{s[1]} Min.</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Eigene Spanne: {spanne[0]}–{spanne[1]} Min.</p>
          <Slider min={0} max={45} step={1} value={spanne} onValueChange={setSpanne} onValueCommit={fenster} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Genau</p>
          <input type="number" min={0} defaultValue={b.zeit_von == null ? b.minuten || '' : ''} placeholder="Min."
            onKeyDown={(e) => e.key === 'Enter' && exakt(e.currentTarget.value)} onBlur={(e) => e.target.value !== '' && exakt(e.target.value)}
            className="h-8 w-20 rounded-md border bg-background px-2 text-sm" />
          <span className="text-xs text-muted-foreground">Minuten</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}