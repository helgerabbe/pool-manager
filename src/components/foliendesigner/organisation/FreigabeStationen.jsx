import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Umschalter from '../einstellungen/Umschalter';
import { LOESUNG_FUER } from '@/lib/folienOrganisation';

const Zahl = ({ label, wert, min, setze }) => (
  <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">{label}: {wert}</p>
    <Slider min={min} max={10} step={1} value={[wert]} onValueChange={([v]) => setze(v)} /></div>
);
const Schalter = ({ label, text, wert, setze }) => (
  <label className="flex items-start justify-between gap-3">
    <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
    <Switch checked={wert} onCheckedChange={setze} />
  </label>
);

/** Zusatzeinstellungen für „Freigabe nach Lösung“ und den Ablauf „Stationen“. */
export default function FreigabeStationen({ o, setze }) {
  return (
    <>
      {o.freigabe === 'geloest' && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Die nächste Folie öffnet sich erst, wenn die Übung auf dieser Folie richtig gelöst ist (z. B. Escape Room). Braucht ein Element mit der Funktion „Übung“.</p>
          <Umschalter titel="Gelöst sein muss" optionen={LOESUNG_FUER} wert={o.loesung_fuer} setze={(v) => setze({ loesung_fuer: v })} />
          <Schalter label="Hinweis bei falscher Lösung" text="Statt nur „falsch“ erscheint ein Tipp." wert={o.loesung_hinweis} setze={(v) => setze({ loesung_hinweis: v })} />
        </div>
      )}
      {o.ablauf === 'stationen' && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Jede Folie ist eine Station. Die Schüler wählen die Reihenfolge selbst.</p>
          <Zahl label="Pflichtstationen" min={1} wert={o.pflicht_stationen} setze={(v) => setze({ pflicht_stationen: v })} />
          <Zahl label="Wahlstationen" min={0} wert={o.wahl_stationen} setze={(v) => setze({ wahl_stationen: v })} />
          <Schalter label="Laufzettel" text="Schüler und Lehrkraft sehen, welche Stationen erledigt sind." wert={o.laufzettel} setze={(v) => setze({ laufzettel: v })} />
        </div>
      )}
    </>
  );
}