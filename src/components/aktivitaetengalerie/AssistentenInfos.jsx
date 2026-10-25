import React from 'react';
import { Palette, ListOrdered, LayoutList } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import GrafikAnweisungAssistent from './GrafikAnweisungAssistent';
import WuenscheFeld from './WuenscheFeld';
import SchrittfolgeTabelle from './SchrittfolgeTabelle';
import AbgleichEntscheidungsbaum from './AbgleichEntscheidungsbaum';
import { kiMethodenBeschreibung, kiGrafikTafel, kiGrafikTablet } from '@/lib/kiGrafikAnweisung';
import { kiGrobTafel, kiGrobTablet } from '@/lib/kiGrobuebersicht';

const FELDER = [
  ['wuensche'],
  ['info_methodenbeschreiber', 'Ablauf und Funktionalität (Methodenbeschreiber)', ListOrdered],
  ['info_grobuebersicht', 'Grobübersicht des Foliensatzes', LayoutList],
  ['info_grafikassistent', 'Informationen für den Grafikassistenten (Feinplanung)', Palette],
];

const KI = {
  info_methodenbeschreiber: { erzeugen: kiMethodenBeschreibung, knopf: 'Bereich befüllen', hinweis: 'Der Methodenbeschreiber erstellt eine Foliensatz-Expertise und berücksichtigt dabei, was dir wichtig ist.' },
  info_grobuebersicht: { knoepfe: [
    { label: '1. Grober Foliensatz Tafel', erzeugen: kiGrobTafel },
    { label: '2. Grobe Tablet-Ansicht', erzeugen: kiGrobTablet },
  ], hinweis: 'Nur die Folienfolge mit kurzer Beschreibung je Folie. Prüfe und bessere hier nach, bevor die Feinplanung entsteht.' },
  info_grafikassistent: { knoepfe: [
    { label: '1. Tafelfolien', erzeugen: kiGrafikTafel },
    { label: '2. Tablet-Ansicht', erzeugen: kiGrafikTablet },
  ], hinweis: 'Feinplanung auf Grundlage der Grobübersicht: alle Elemente, Funktionen, Organisation und Steuerung.' },
};

/** Arbeitsgrundlagen für Unterrichtsassistent, Methodenbeschreiber und Grafikassistent. */
export default function AssistentenInfos({ werte, setze }) {
  if (werte.foliensatz_status_quo) return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm font-medium"><Palette className="h-4 w-4 text-primary" />Status quo des Foliensatzes (Informationen für den Grafikassistenten)</p>
      <p className="text-xs text-muted-foreground">Genaue Beschreibung des fertig gebauten Foliensatzes. Damit lässt er sich identisch wieder erstellen.</p>
      <Textarea rows={16} value={werte.info_grafikassistent || ''} onChange={(e) => setze('info_grafikassistent', e.target.value)} />
      <AbgleichEntscheidungsbaum werte={werte} setze={setze} />
    </div>
  );
  return (
    <div className="space-y-4">
      {FELDER.map(([k, label, Icon]) => k === 'wuensche' ? <WuenscheFeld key={k} werte={werte} setze={setze} /> : (
        <div key={k} className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{label}</p>
          {KI[k] && <GrafikAnweisungAssistent key={k} werte={werte} setze={setze} feld={k} {...KI[k]}
            gesperrt={k === 'info_grafikassistent' && !(werte.info_grobuebersicht || '').trim()}
            hinweis={k === 'info_grafikassistent' && !(werte.info_grobuebersicht || '').trim() ? 'Erstelle zuerst die Grobübersicht.' : KI[k].hinweis} />}
          <Textarea rows={KI[k] ? 16 : 10} value={werte[k] || ''} onChange={(e) => setze(k, e.target.value)} />
        </div>
      ))}
      <SchrittfolgeTabelle werte={werte} setze={setze} />
    </div>
  );
}