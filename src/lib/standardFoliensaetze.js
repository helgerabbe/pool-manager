// Feste Foliensätze je Methode (2026-10-23): gemeinsam mit der Lehrkraft entwickelt, nicht KI-generiert.
// Schlüssel = Methodenname; je Kanal (digital | analog) die Folienfolge aus festen Vorlagen (src/lib/folienVorlagen.js).
// Je Folie: 'liegt' = was auf der Folie zu sehen ist, 'entscheidungen' = was die Lehrkraft vorher festlegt
// (Grundlage für die Fragen des Unterrichtsassistenten beim Erstellen der Stunde).
import { FOLIEN_VORLAGEN } from '@/lib/folienVorlagen';

const f = (id, kanal, d) => ({ id, kanal, status: 'fertig', folientyp: FOLIEN_VORLAGEN[d.vorlage].folientyp, ...d });

const tps = (k) => [
  f('tps1', k, { vorlage: 'uebersicht', titel: 'Think – Pair – Share', untertitel: 'Erst allein denken, dann zu zweit, dann alle', phase: 'Einstieg', freigabe: 'lehrkraft',
    phasen: [
      { name: 'Think', sozialform: 'EA', satz: 'Du denkst allein nach und notierst deine Ideen.' },
      { name: 'Pair', sozialform: 'PA', satz: 'Ihr vergleicht eure Ideen und einigt euch.' },
      { name: 'Share', sozialform: 'PL', satz: 'Ihr stellt eure Ergebnisse der Klasse vor.' },
    ],
    erklaerung: 'Zeigt den Ablauf der Methode, bevor es losgeht.',
    liegt: ['Titel und Untertitel der Methode', 'Drei Phasenkarten mit Sozialform-Symbol und einem Satz', 'Pfeile zwischen den Phasen', 'Weiter-Knopf (Lehrkraft gibt frei)'],
    entscheidungen: [] }),
  f('tps2', k, { vorlage: 'aufgabe', titel: 'Eure Aufgabe', phase: 'Think', sozialform: 'EA', minuten: 5, freigabe: 'lehrkraft',
    erklaerung: 'Hier steht die Aufgabe der Stunde.',
    liegt: ['Aufgabenbox mit dem Aufgabentext', 'Sozialform Einzelarbeit oben rechts', 'Timer oben rechts'],
    entscheidungen: ['Wie lautet die Denkfrage bzw. Aufgabe?', 'Gibt es Material zur Aufgabe (Text, Bild)?'] }),
  f('tps3', k, { vorlage: 'phase', titel: 'Think', phase: 'Think', sozialform: 'EA', minuten: 5, freigabe: 'zeit',
    auftrag: k === 'digital' ? 'Denke allein über die Aufgabe nach. Schreibe deine Ideen in das Notizfeld.' : 'Denke allein über die Aufgabe nach. Schreibe deine Ideen in dein Heft.',
    hinweis: 'Bitte leise arbeiten', erklaerung: 'Stille Einzelarbeit mit Timer.',
    liegt: ['Arbeitsauftrag für die Einzelarbeit', 'Hinweis „Bitte leise arbeiten“', 'Sozialform und Timer oben rechts', k === 'digital' ? 'Notizfeld auf dem Tablet' : 'Verweis auf das Heft'],
    entscheidungen: ['Wie lange dauert die Think-Phase?', 'Geht es nach Ablauf der Zeit automatisch weiter oder gibt die Lehrkraft frei?'] }),
  f('tps4', k, { vorlage: 'standard', standard: 'partner', phase: 'Pair', freigabe: 'lehrkraft', erklaerung: 'Die Schüler finden ihren Partner.',
    liegt: ['Standardfolie „Partner finden“', 'Partnernummer je Paar'],
    entscheidungen: ['Wie werden die Partner gebildet (Sitznachbar, zufällig, feste Paare)?', 'Sind Dreiergruppen erlaubt?'] }),
  f('tps5', k, { vorlage: 'phase', titel: 'Pair', phase: 'Pair', sozialform: 'PA', minuten: 7, freigabe: 'zeit',
    auftrag: 'Erzählt euch eure Ideen. Einigt euch auf die besten und haltet sie fest.',
    hinweis: 'Flüsterstimme', erklaerung: 'Austausch zu zweit.',
    liegt: ['Arbeitsauftrag für die Partnerarbeit', 'Hinweis „Flüsterstimme“', 'Sozialform und Timer oben rechts'],
    entscheidungen: ['Wie lange dauert die Pair-Phase?', 'Wie halten die Paare ihr Ergebnis fest?'] }),
  f('tps6', k, { vorlage: 'uebergang', titel: 'Jetzt: Share', phase: 'Share', sozialform: 'PL', freigabe: 'lehrkraft',
    satz: 'Stellt eure besten Ideen der Klasse vor.', erklaerung: 'Wechsel ins Plenum.',
    liegt: ['Großes Plenum-Symbol', 'Ein Satz zum Wechsel'],
    entscheidungen: ['Wer stellt vor (freiwillig, ausgelost, alle Paare)?'] }),
  f('tps7', k, { vorlage: 'sicherung', titel: 'Das nehmen wir mit', phase: 'Share', freigabe: 'lehrkraft',
    punkte: ['Wichtigste Idee 1', 'Wichtigste Idee 2', 'Wichtigste Idee 3'],
    erklaerung: 'Die Lehrkraft hält die Ergebnisse fest.',
    liegt: ['Merksatz-Box mit bis zu vier Stichpunkten'],
    entscheidungen: ['Werden die Ergebnisse vorab erwartet (Erwartungshorizont) oder live gesammelt?'] }),
];

export const STANDARD_FOLIENSAETZE = {
  'Think-Pair-Share': { digital: tps('digital'), analog: tps('analog') },
};

export const standardSatz = (name, kanal) => {
  const s = STANDARD_FOLIENSAETZE[name]?.[kanal];
  return s ? { thema: '', standard: true, folien: s } : null;
};