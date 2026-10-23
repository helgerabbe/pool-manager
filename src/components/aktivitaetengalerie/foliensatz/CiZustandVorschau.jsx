import React from 'react';
import { Hourglass, Lock, CheckCircle2, WifiOff } from 'lucide-react';
import { CI_GRUND, CI_ZUSTAENDE, CI_RASTER } from '@/lib/folienCI';

const ICONS = { Hourglass, Lock, CheckCircle2, WifiOff };

/** Vorschau Teil 10: Zustände auf dem Schülergerät. */
export default function CiZustandVorschau() {
  return (
    <div className="grid gap-3 rounded-xl p-4 ring-1 ring-border sm:grid-cols-4" style={{ background: CI_GRUND.hintergrund }}>
      {Object.entries(CI_ZUSTAENDE).map(([k, z]) => {
        const Icon = ICONS[z.symbol];
        return (
          <div key={k} className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-border">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: z.hg, color: z.text }}><Icon className="h-6 w-6" /></span>
            <p className="text-sm font-semibold" style={{ color: z.text }}>{z.titel}</p>
            <p className="text-xs text-muted-foreground">{z.satz}</p>
            {k === 'warten' && <img src={CI_RASTER.logo.url} alt="Pool-Manager" className="mt-2 h-8 rounded-sm object-contain opacity-70" />}
          </div>
        );
      })}
    </div>
  );
}