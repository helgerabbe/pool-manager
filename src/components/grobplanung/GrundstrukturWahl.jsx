import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { VARIANTEN_PHASEN } from '@/lib/induktiveVarianten';
import { VARIANTEN_LISTEN } from '@/components/aktivitaetengalerie/VariantenPassung';
import { modellName } from '@/components/unterrichtsplanung/StundenmodellVorschlag';

/** Wirksame Grundstruktur: eigene Wahl, sonst der Vorschlag aus dem Einheitenverlauf. null = offen. */
export function wirksameGrundstruktur(wahl, abschnitt) {
  if (wahl?.offen) return null;
  if (wahl?.modell) return wahl;
  return abschnitt?.modell ? { modell: abschnitt.modell, variante: abschnitt.modell_variante } : null;
}

const phasenVon = (m, v) => {
  const vv = VARIANTEN_LISTEN[m]?.find((x) => x.key === v);
  return vv?.phasen || VARIANTEN_PHASEN[v] || STUNDEN_MODELLE.find((x) => x.key === m)?.phasen || [];
};

const Option = ({ an, titel, text, phasen, onClick }) => (
  <button type="button" onClick={onClick} className={`w-full rounded-lg border p-3 text-left transition-all ${an ? 'border-primary bg-primary/5 shadow-sm' : 'bg-card hover:border-primary/40'}`}>
    <div className="flex items-center gap-2">
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${an ? 'border-primary bg-primary text-primary-foreground' : ''}`}>{an && <Check className="h-3 w-3" />}</span>
      <span className="text-sm font-semibold">{titel}</span>
    </div>
    {text && <p className="mt-1 pl-6 text-xs text-muted-foreground">{text}</p>}
    {an && phasen?.length > 0 && <p className="mt-1.5 pl-6 text-xs text-primary">Ablauf: {phasen.join(' → ')}</p>}
  </button>
);

/** Auswahl der methodischen Grundstruktur (Stundenmodell) aus Vorschlag, Alternativen oder offen. */
export default function GrundstrukturWahl({ abschnitt: s, wahl, setWahl }) {
  const akt = wirksameGrundstruktur(wahl, s);
  const ist = (m, v) => akt?.modell === m && (akt?.variante || '') === (v || '');
  const optionen = [
    { modell: s.modell, variante: s.modell_variante, text: s.modell_begruendung, typisch: true },
    ...(s.modell_alternativen || []).map((a) => ({ modell: a.modell, variante: a.variante, text: a.hinweis })),
  ].filter((o) => modellName(o.modell, o.variante));
  return (
    <div className="mb-4 space-y-2">
      <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <p>Die Grundstruktur legt fest, wie die Stunde im Großen und Ganzen abläuft. Ich achte beim Bau der Stunde vor allem darauf. Du kannst wählen oder es offen lassen, dann nehme ich die am besten passende.</p>
      </div>
      {optionen.map((o) => (
        <Option key={`${o.modell}_${o.variante}`} an={ist(o.modell, o.variante)} onClick={() => setWahl({ modell: o.modell, variante: o.variante })}
          titel={`${modellName(o.modell, o.variante)}${o.typisch ? ' (typisch)' : ''}`} text={o.text} phasen={phasenVon(o.modell, o.variante)} />
      ))}
      <Option an={!akt} onClick={() => setWahl({ offen: true })} titel="Offen lassen" text="Der Assistent wählt die am besten passende Grundstruktur." />
    </div>
  );
}