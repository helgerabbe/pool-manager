// Feste Foliensätze je Methode (2026-10-23): gemeinsam mit der Lehrkraft entwickelt, nicht KI-generiert.
// Schlüssel = Methodenname; je Kanal (digital | analog) die Folienfolge aus festen Vorlagen (src/lib/folienVorlagen.js).
import { FOLIEN_VORLAGEN } from '@/lib/folienVorlagen';

const f = (id, kanal, d) => ({ id, kanal, status: 'fertig', folientyp: FOLIEN_VORLAGEN[d.vorlage].folientyp, ...d });

const tps = (k) => [
  f('tps1', k, { vorlage: 'uebersicht', titel: 'Think – Pair – Share', untertitel: 'Erst allein denken, dann zu zweit, dann alle', phase: 'Einstieg', freigabe: 'lehrkraft',
    phasen: [
      { name: 'Think', sozialform: 'EA', satz: 'Du denkst allein nach und notierst deine Ideen.' },
      { name: 'Pair', sozialform: 'PA', satz: 'Ihr vergleicht eure Ideen und einigt euch.' },
      { name: 'Share', sozialform: 'PL', satz: 'Ihr stellt eure Ergebnisse der Klasse vor.' },
    ],
    erklaerung: 'Zeigt den Ablauf der Methode, bevor es losgeht.' }),
  f('tps2', k, { vorlage: 'aufgabe', titel: 'Eure Aufgabe', phase: 'Think', sozialform: 'EA', minuten: 5, freigabe: 'lehrkraft',
    erklaerung: 'Hier steht die Aufgabe der Stunde.', abfrage: 'Aufgabentext der Stunde' }),
  f('tps3', k, { vorlage: 'phase', titel: 'Think', phase: 'Think', sozialform: 'EA', minuten: 5, freigabe: 'zeit',
    auftrag: k === 'digital' ? 'Denke allein über die Aufgabe nach. Schreibe deine Ideen in das Notizfeld.' : 'Denke allein über die Aufgabe nach. Schreibe deine Ideen in dein Heft.',
    hinweis: 'Bitte leise arbeiten', erklaerung: 'Stille Einzelarbeit mit Timer.' }),
  f('tps4', k, { vorlage: 'standard', standard: 'partner', phase: 'Pair', freigabe: 'lehrkraft', erklaerung: 'Die Schüler finden ihren Partner.' }),
  f('tps5', k, { vorlage: 'phase', titel: 'Pair', phase: 'Pair', sozialform: 'PA', minuten: 7, freigabe: 'zeit',
    auftrag: 'Erzählt euch eure Ideen. Einigt euch auf die besten und haltet sie fest.',
    hinweis: 'Flüsterstimme', erklaerung: 'Austausch zu zweit.' }),
  f('tps6', k, { vorlage: 'uebergang', titel: 'Jetzt: Share', phase: 'Share', sozialform: 'PL', freigabe: 'lehrkraft',
    satz: 'Stellt eure besten Ideen der Klasse vor.', erklaerung: 'Wechsel ins Plenum.' }),
  f('tps7', k, { vorlage: 'sicherung', titel: 'Das nehmen wir mit', phase: 'Share', freigabe: 'lehrkraft',
    punkte: ['Wichtigste Idee 1', 'Wichtigste Idee 2', 'Wichtigste Idee 3'],
    erklaerung: 'Die Lehrkraft hält die Ergebnisse fest.', abfrage: 'Ergebnisse aus dem Plenum' }),
];

export const STANDARD_FOLIENSAETZE = {
  'Think-Pair-Share': { digital: tps('digital'), analog: tps('analog') },
};

export const standardSatz = (name, kanal) => {
  const s = STANDARD_FOLIENSAETZE[name]?.[kanal];
  return s ? { thema: 'Standard', standard: true, folien: s } : null;
};