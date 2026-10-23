import React from 'react';
import { CheckCircle2, CircleDot, RotateCcw, Eye } from 'lucide-react';
import { CI_GRUND, CI_RUECKMELDUNG, CI_RUECKMELDUNG_REGEL } from '@/lib/folienCI';

const ICONS = { CheckCircle2, CircleDot, RotateCcw, Eye };

/** Vorschau Teil 8: Rückmeldungen nach „Prüfen“. */
export default function CiRueckmeldungVorschau() {
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(CI_RUECKMELDUNG).map(([k, r]) => {
          const Icon = ICONS[r.symbol];
          return (
            <div key={k} className="flex items-start gap-3 rounded-xl border p-3" style={{ background: r.hg, borderColor: r.rand, color: r.text }}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="text-sm font-semibold">{r.titel}</p><p className="text-xs">{r.satz}</p></div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{CI_RUECKMELDUNG_REGEL}</p>
    </div>
  );
}