import React from 'react';
import { Input } from '@/components/ui/input';
import Umschalter from './Umschalter';
import { ELEMENT_FUNKTIONEN } from '@/lib/folienFunktionen';

const SICHTBAR_FUER = [['alle', 'Alle'], ['zuteilung', 'Rolle / Gruppe'], ['je_schueler', 'Je Schüler']];
const VERTEILUNG = [['verteilen', 'Verteilen'], ['mischen', 'Mischen']];
const ERGEBNISSE = [['sofort', 'Sofort'], ['verdeckt', 'Nach Freigabe']];
const NAMEN = [['mit_namen', 'Mit Namen'], ['anonym', 'Anonym']];

/** Wer sieht das Element, und wie sichtbar sind die Ergebnisse? */
export default function SichtbarkeitWahl({ el, setze }) {
  const sichtbar = el.sichtbar_fuer || 'alle';
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold">Sichtbarkeit</p>
      <Umschalter titel="Sichtbar für" optionen={SICHTBAR_FUER} wert={sichtbar} setze={(v) => setze({ sichtbar_fuer: v })} />
      {sichtbar === 'zuteilung' && <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Welche Rolle oder Gruppe?</p>
        <Input value={el.sichtbar_kennung || ''} onChange={(e) => setze({ sichtbar_kennung: e.target.value })} placeholder="z. B. Partner A, Gruppe 2, Erklärer" /></div>}
      {sichtbar === 'je_schueler' && <>
        <Umschalter titel="Inhalte" optionen={VERTEILUNG} wert={el.verteilung || 'verteilen'} setze={(v) => setze({ verteilung: v })} />
        <p className="text-xs text-muted-foreground">{(el.verteilung || 'verteilen') === 'verteilen' ? 'Jeder Schüler bekommt einen anderen Inhalt (z. B. Kettenquiz).' : 'Alle haben dieselben Inhalte in eigener Reihenfolge (z. B. Bingo).'}</p>
      </>}
      {ELEMENT_FUNKTIONEN[el.typ] && <>
        <Umschalter titel="Ergebnisse der anderen sichtbar" optionen={ERGEBNISSE} wert={el.ergebnisse || 'sofort'} setze={(v) => setze({ ergebnisse: v })} />
        <Umschalter titel="Beiträge zeigen" optionen={NAMEN} wert={el.namen || 'mit_namen'} setze={(v) => setze({ namen: v })} />
      </>}
    </div>
  );
}