import React from 'react';
import { Image } from 'lucide-react';

const Chip = ({ children }) => <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs">{children}</span>;
const Luecke = () => <span className="mx-1 inline-block h-5 w-14 rounded border-2 border-dashed border-border align-middle" />;

/** Vorschau der Zieh-Interaktionen und der Live-Pinnwand (ohne Funktion). */
export default function ZiehInhalte({ typ }) {
  if (typ === 'lueckentext_dnd') return (
    <div className="w-full space-y-2 text-sm">
      <p>Die Sonne ist ein <Luecke /> und die Erde ein <Luecke />.</p>
      <div className="flex gap-1.5"><Chip>Stern</Chip><Chip>Planet</Chip><Chip>Mond</Chip></div>
    </div>
  );
  if (typ === 'bildbeschriftung') return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="relative flex-1 rounded-md bg-muted">
        <Image className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
        <span className="absolute left-[15%] top-[20%] h-5 w-14 rounded border-2 border-dashed border-primary bg-background/70" />
        <span className="absolute right-[12%] bottom-[18%] h-5 w-14 rounded border-2 border-dashed border-primary bg-background/70" />
      </div>
      <div className="flex gap-1.5"><Chip>Begriff 1</Chip><Chip>Begriff 2</Chip></div>
    </div>
  );
  if (typ === 'kanban') return (
    <div className="grid h-full w-full grid-cols-3 gap-2 text-xs">
      {[['Offen', 2], ['In Arbeit', 1], ['Fertig', 1]].map(([t, n]) => (
        <div key={t} className="space-y-1.5 rounded-md bg-muted p-1.5">
          <p className="font-semibold">{t}</p>
          {Array.from({ length: n }, (_, i) => <div key={i} className="rounded bg-background px-1.5 py-1 shadow-sm">Karte</div>)}
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="grid flex-1 grid-cols-3 gap-1.5 text-xs">
        {['Idee A', 'Idee B', 'Idee C', 'Idee D'].map((t, i) => (
          <div key={t} className={`rounded-md p-1.5 shadow-sm ${i % 2 ? 'bg-chart-3/20' : 'bg-accent/25'}`}>{t}</div>
        ))}
      </div>
      <div className="h-7 rounded-md border border-input bg-background px-2 text-xs leading-7 text-muted-foreground">Dein Beitrag erscheint bei allen …</div>
    </div>
  );
}