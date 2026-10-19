import React from 'react';
import { Bot, Palette, ListOrdered } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import GrafikAnweisungAssistent from './GrafikAnweisungAssistent';
import { kiMethodenBeschreibung, kiGrafikAnweisung } from '@/lib/kiGrafikAnweisung';

const FELDER = [
  ['info_unterrichtsassistent', 'Informationen für den Unterrichtsassistenten', Bot],
  ['info_methodenbeschreiber', 'Ablauf und Funktionalität (Methodenbeschreiber)', ListOrdered],
  ['info_grafikassistent', 'Informationen für den Grafikassistenten', Palette],
];

const KI = {
  info_methodenbeschreiber: { erzeugen: kiMethodenBeschreibung, hinweis: 'Der Methodenbeschreiber beschreibt ausführlich, wie die Methode abläuft und funktioniert, noch ohne Grafik.', platzhalter: 'z. B. Die Gruppen sollen zweimal rotieren' },
  info_grafikassistent: { erzeugen: kiGrafikAnweisung, hinweis: 'Der Grafikassistent macht aus der Methodenbeschreibung eine Beschreibung von Lehrer- und Schüleransicht.', platzhalter: 'z. B. Schüler sollen ihre Gruppe vorher auswählen können' },
};

/** Arbeitsgrundlagen für Unterrichtsassistent, Methodenbeschreiber und Grafikassistent. */
export default function AssistentenInfos({ werte, setze }) {
  return (
    <div className="space-y-4">
      {FELDER.map(([k, label, Icon]) => (
        <div key={k} className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{label}</p>
          {KI[k] && <GrafikAnweisungAssistent key={k} werte={werte} setze={setze} feld={k} {...KI[k]} />}
          <Textarea rows={KI[k] ? 16 : 10} value={werte[k] || ''} onChange={(e) => setze(k, e.target.value)} />
        </div>
      ))}
    </div>
  );
}