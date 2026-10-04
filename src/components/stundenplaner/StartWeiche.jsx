import React from 'react';
import { ListOrdered, PenLine } from 'lucide-react';
import AbschnittWahl from './AbschnittWahl';
import FreieStunde from './FreieStunde';

/** Schritt 1: Weiche – Stunde aus dem Verlauf holen oder frei planen. */
export default function StartWeiche({ verlauf, onWahl }) {
  const hatVerlauf = verlauf?.length > 0;
  const [weg, setWeg] = React.useState(hatVerlauf ? null : 'frei');
  if (weg === 'verlauf') return <AbschnittWahl verlauf={verlauf} onWahl={onWahl} />;
  if (weg === 'frei') return <FreieStunde onWeiter={(a) => onWahl(a, 0)} onZurueck={hatVerlauf ? () => setWeg(null) : null} />;
  const Karte = ({ icon: Icon, titel, text, onClick }) => (
    <button type="button" onClick={onClick} className="flex flex-1 items-start gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary">
      <Icon className="mt-0.5 h-5 w-5 text-primary" />
      <span><span className="block text-sm font-semibold">{titel}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
    </button>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Wie möchtest du die Stunde planen?</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Karte icon={ListOrdered} titel="Aus dem Verlauf" text="Einen Abschnitt aus der Struktur der Einheit übernehmen." onClick={() => setWeg('verlauf')} />
        <Karte icon={PenLine} titel="Frei planen" text="Thema und Ziel selbst festlegen." onClick={() => setWeg('frei')} />
      </div>
    </div>
  );
}