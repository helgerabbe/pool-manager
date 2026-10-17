import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { modellName } from '@/components/unterrichtsplanung/StundenmodellVorschlag';
import { grundstrukturPassung, passendeMethoden } from '@/lib/methodenGrundstrukturPassung';

/** Hinweis auf die gewählte Grundstruktur: Warnung bei unpassender Methode, sonst passende Vorschläge. */
export default function GrundstrukturMethodenHinweis({ grund, wahl, onWaehlen }) {
  if (!grund) return null;
  const name = modellName(grund.modell, grund.variante);
  const p = wahl && !wahl.idee && grundstrukturPassung(wahl.name, grund);
  if (p && p.wert >= 4) return (
    <div className="flex gap-3 rounded-xl border border-accent/50 bg-accent/10 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-accent" />
      <p>Du hast dich für die Grundstruktur <b>{name}</b> entschieden. {wahl.name} scheint mir dazu nicht besonders passend{p.hinweis ? ` (${p.hinweis})` : ''}. Vielleicht passt eine andere Grundstruktur, oder du meinst eine andere Methode. Wenn du möchtest, übernehme ich sie aber erst mal so.</p>
    </div>
  );
  const vorschlaege = passendeMethoden(grund);
  return (
    <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <Sparkles className="h-5 w-5 shrink-0 text-primary" />
      <div className="space-y-2">
        <p>Du hast die Grundstruktur <b>{name}</b> gewählt. Nicht alle Methoden passen gleich gut dazu.{vorschlaege.length > 0 && ' Gut geeignet sind zum Beispiel:'}</p>
        {vorschlaege.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vorschlaege.map((m) => (
              <button key={m.name} type="button" title={m.p.hinweis} onClick={() => onWaehlen({ name: m.name })}
                className="rounded-full border border-primary/40 bg-card px-2.5 py-1 text-xs hover:bg-primary/10">{m.name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}