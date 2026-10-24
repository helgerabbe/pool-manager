import React from 'react';
import TeamKachel from '../standard/TeamKachel';

/** Fortschritt: bei Einzelarbeit anonym als Balken, bei Teams je Paar/Gruppe eine Kachel. */
export default function TafelFortschritt({ teams, gruppe, an, rm }) {
  if (!teams) return (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-[10px]">
      <span className="shrink-0">12 von 24 fertig</span>
      <div className="h-1.5 flex-1 rounded bg-[#E4E1DA]"><div className="h-1.5 w-1/2 rounded bg-[#7FA6D6]" /></div>
    </div>
  );
  return (
    <div className={`grid gap-1 ${gruppe ? 'grid-cols-4' : 'grid-cols-6'}`}>
      {teams.map((t) => (
        <TeamKachel key={t.n} t={t} gruppe={gruppe} rueckmeldung={an.rueckmeldung} experte={an.experten} sterne={rm.sterne[t.n]}
          onStern={() => rm.senden(t.n, 'stern')} onLeise={() => rm.senden(t.n, 'leise')} />
      ))}
    </div>
  );
}