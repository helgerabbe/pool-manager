import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PROFIL_SKALEN, JAHRGAENGE, EIGNUNG } from '@/lib/anspruchsProfil';

const ton = (w) => (w <= 2 ? 'bg-green-500' : w === 3 ? 'bg-yellow-400' : 'bg-orange-500');

/** Anspruchsprofil: Skalen, Eignung je Jahrgang und Fazit. */
export default function AnspruchsProfil({ profil }) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Anspruchsprofil</div>
      <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
        {PROFIL_SKALEN.map((s) => {
          const w = profil.werte[s.key] || 0;
          return (
            <div key={s.key} className="flex items-center justify-between gap-3" title={s.frage}>
              <span className="text-sm">{s.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2.5 w-6 rounded-full ${i <= w ? ton(w) : 'bg-muted'}`} />)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Eignung nach Jahrgang</p>
        <div className="flex gap-1">
          {JAHRGAENGE.map((j) => {
            const e = EIGNUNG[profil.jahrgaenge[j]] || EIGNUNG.nein;
            return <div key={j} title={e.label} className={`flex h-8 flex-1 items-center justify-center rounded-md text-xs font-semibold text-white ${e.cls}`}>{j}</div>;
          })}
        </div>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
          {Object.values(EIGNUNG).map((e) => <span key={e.label} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${e.cls}`} />{e.label}</span>)}
        </div>
      </div>
      {profil.fazit && <p className="rounded-lg bg-muted/50 p-3 text-sm">{profil.fazit}</p>}
    </div>
  );
}