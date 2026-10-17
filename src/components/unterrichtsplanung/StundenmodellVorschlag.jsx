import React from 'react';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { VARIANTEN_LISTEN } from '@/components/aktivitaetengalerie/VariantenPassung';

/** Lesbarer Name eines Stundenmodells samt Variante. */
export function modellName(modell, variante) {
  const m = STUNDEN_MODELLE.find((x) => x.key === modell);
  if (!m) return null;
  const v = VARIANTEN_LISTEN[modell]?.find((x) => x.key === variante);
  return v ? `${m.name} · ${v.name}` : m.name;
}

/** Plakette für die Kopfzeile eines Verlaufsabschnitts. */
export function ModellPlakette({ abschnitt }) {
  const name = modellName(abschnitt.modell, abschnitt.modell_variante);
  if (!name) return null;
  return <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">{name}</span>;
}

/** Aufgeklappt: Begründung des Hauptvorschlags und weitere mögliche Modelle. */
export default function StundenmodellVorschlag({ abschnitt: s }) {
  if (!s.modell) return null;
  const alt = (s.modell_alternativen || []).filter((a) => modellName(a.modell, a.variante));
  return (
    <div className="mt-2 space-y-1.5 rounded-md bg-primary/5 p-2">
      <p className="text-xs"><span className="font-semibold text-primary">Typische Stunde: </span>{modellName(s.modell, s.modell_variante)}{s.modell_begruendung && <span className="text-muted-foreground"> – {s.modell_begruendung}</span>}</p>
      {alt.length > 0 && (
        <div className="text-xs">
          <span className="font-semibold text-muted-foreground">Auch möglich:</span>
          <ul className="mt-0.5 space-y-0.5">
            {alt.map((a, i) => <li key={i}>• {modellName(a.modell, a.variante)}{a.hinweis && <span className="text-muted-foreground"> – {a.hinweis}</span>}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}