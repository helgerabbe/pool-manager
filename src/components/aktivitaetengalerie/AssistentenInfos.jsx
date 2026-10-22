import React from 'react';
import { Palette, ListOrdered, LayoutList } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import GrafikAnweisungAssistent from './GrafikAnweisungAssistent';
import WuenscheFeld from './WuenscheFeld';
import AbgleichEntscheidungsbaum from './AbgleichEntscheidungsbaum';
import { kiMethodenBeschreibung, kiGrafikAnalog, kiGrafikDigital, kiGrafikGemeinsam } from '@/lib/kiGrafikAnweisung';
import { kiGrobAnalog, kiGrobDigital } from '@/lib/kiGrobuebersicht';

const FELDER = [
  ['wuensche'],
  ['info_methodenbeschreiber', 'Ablauf und Funktionalität (Methodenbeschreiber)', ListOrdered],
  ['info_grobuebersicht', 'Grobübersicht des Foliensatzes', LayoutList],
  ['info_grafikassistent', 'Informationen für den Grafikassistenten (Feinplanung)', Palette],
];

const KI = {
  info_methodenbeschreiber: { erzeugen: kiMethodenBeschreibung, knopf: 'Bereich befüllen', hinweis: 'Der Methodenbeschreiber erstellt eine Foliensatz-Expertise und berücksichtigt dabei, was dir wichtig ist.' },
  info_grobuebersicht: { knoepfe: [
    { label: '1. Grob analog', erzeugen: kiGrobAnalog },
    { label: '2. Grob digital', erzeugen: kiGrobDigital },
  ], hinweis: 'Nur die Folienfolge mit kurzer Beschreibung je Folie. Prüfe und bessere hier nach, bevor die Feinplanung entsteht.' },
  info_grafikassistent: { knoepfe: [
    { label: '1. Analoge Folien', erzeugen: kiGrafikAnalog },
    { label: '2. Digitale Folien', erzeugen: kiGrafikDigital },
    { label: '3. Abfragen & Vergleich', erzeugen: kiGrafikGemeinsam },
  ], hinweis: 'Feinplanung auf Grundlage der Grobübersicht: alle Elemente, Funktionen, Organisation und Steuerung.' },
};

/** Arbeitsgrundlagen für Unterrichtsassistent, Methodenbeschreiber und Grafikassistent. */
export default function AssistentenInfos({ werte, setze }) {
  return (
    <div className="space-y-4">
      {FELDER.map(([k, label, Icon]) => k === 'wuensche' ? <WuenscheFeld key={k} werte={werte} setze={setze} /> : (
        <div key={k} className="space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{label}</p>
          {KI[k] && <GrafikAnweisungAssistent key={k} werte={werte} setze={setze} feld={k} {...KI[k]}
            gesperrt={k === 'info_grafikassistent' && !(werte.info_grobuebersicht || '').trim()}
            hinweis={k === 'info_grafikassistent' && !(werte.info_grobuebersicht || '').trim() ? 'Erstelle zuerst die Grobübersicht.' : KI[k].hinweis} />}
          <Textarea rows={KI[k] ? 16 : 10} value={werte[k] || ''} onChange={(e) => setze(k, e.target.value)} />
          {k === 'info_grobuebersicht' && <AbgleichEntscheidungsbaum werte={werte} setze={setze} />}
        </div>
      ))}
    </div>
  );
}