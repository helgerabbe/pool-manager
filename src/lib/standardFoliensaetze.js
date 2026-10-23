// Feste Foliensätze je Methode (2026-10-23): gemeinsam mit der Lehrkraft entwickelt, nicht KI-generiert.
// Schlüssel = Methodenname; je Kanal (digital | analog) die Folienfolge aus festen Vorlagen (src/lib/folienVorlagen.js).
// Je Folie: 'liegt' = was auf der Folie zu sehen ist, 'entscheidungen' = was die Lehrkraft vorher festlegt
// (Grundlage für die Fragen des Unterrichtsassistenten beim Erstellen der Stunde).
import { FOLIEN_VORLAGEN } from '@/lib/folienVorlagen';

const f = (id, kanal, d) => ({ id, kanal, status: 'fertig', folientyp: FOLIEN_VORLAGEN[d.vorlage].folientyp, ...d });

const tps = (k) => [
  f('tps2', k, { vorlage: 'fokus', titel: 'Unzufrieden im Beruf?', phase: 'Einstieg', freigabe: 'lehrkraft',
    satz: 'Wir wollen jetzt herausfinden, warum viele Menschen mit ihrem Beruf unglücklich sind.',
    bild: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/ab5930a9d_generated_image.png',
    erklaerung: 'Die Lehrkraft stellt den Fokus der Stunde vor: was wir herausfinden wollen. Keine Aufgabe, sondern freier Text.',
    liegt: ['Überschrift', 'Freier Fokus-Satz („Wir wollen herausfinden, …“), keine Aufgabenbox', 'Optional: fotorealistisches Impulsbild im unteren rechten Viertel, leicht blass im Hintergrund, über dem Folienart-Kreis', 'Kein Sozialform-Symbol und kein Timer (Inhaltsfolie)'],
    entscheidungen: ['Welche Überschrift bekommt die Folie?', 'Was wollen wir herausfinden (Fokus der Stunde)?', 'Soll es einen Bildimpuls geben? Wenn ja: welches Motiv (immer fotorealistisch)?'] }),
  f('tps1', k, { vorlage: 'uebersicht', titel: 'Think – Pair – Share', untertitel: 'Erst allein denken, dann zu zweit, dann alle gemeinsam', phase: 'Einstieg', freigabe: 'lehrkraft',
    phasen: [
      { name: 'Think', sozialform: 'EA', satz: 'Du denkst allein nach und notierst deine Ideen.' },
      { name: 'Pair', sozialform: 'PA', satz: 'Ihr vergleicht eure Ideen und einigt euch.' },
      { name: 'Share', sozialform: 'PL', satz: 'Ihr stellt eure Ergebnisse der Klasse vor.' },
    ],
    erklaerung: 'Zeigt den Ablauf der Methode, bevor es losgeht.',
    liegt: ['Titel und Untertitel der Methode', 'Drei Phasenkarten mit Sozialform-Symbol und einem Satz', 'Pfeile zwischen den Phasen', 'Weiter-Knopf (Lehrkraft gibt frei)'],
    entscheidungen: [] }),
  f('tps3', k, { vorlage: 'phase', titel: 'Phase 1: Think', phase: 'Think', sozialform: 'EA', minuten: 5, freigabe: 'zeit', leise: true,
    methodisch: k === 'digital' ? 'Denke allein und leise nach. Schreibe deine Ideen in das Notizfeld.' : 'Denke allein und leise nach. Schreibe deine Ideen in dein Heft oder auf einen Zettel.',
    inhalt: 'Warum sind viele Menschen mit ihrem Beruf unzufrieden? Notiere mindestens drei mögliche Gründe.',
    erklaerung: 'Stille Einzelarbeit mit Timer. Oben die methodische Anweisung (gleich bei jeder Think-Phase), darunter groß die inhaltliche Aufgabe zum Thema.',
    liegt: ['Methodische Anweisung im grauen Streifen „So arbeitest du“ (feststehend)', 'Inhaltliche Aufgabe in der Aufgabenbox (zum Thema der Stunde)', 'Stille-Zeichen, Sozialform und Timer oben rechts', k === 'digital' ? 'Notizfeld auf dem Tablet' : 'Verweis auf Heft oder Zettel'],
    entscheidungen: ['Wie lautet die inhaltliche Aufgabe bzw. Fragestellung?', 'Wie lange dauert die Think-Phase?', 'Geht es nach Ablauf der Zeit automatisch weiter oder gibt die Lehrkraft frei?'] }),
  k === 'analog'
    ? f('tps4', k, { vorlage: 'uebergang', titel: 'Partner finden', phase: 'Pair', sozialform: 'PA', freigabe: 'lehrkraft',
      satz: 'Such dir jetzt einen Partner oder eine Partnerin, mit dem oder der du die nächste Arbeitsphase gestalten möchtest.',
      erklaerung: 'Analog: Die Schüler suchen sich ohne Gerät einen Partner. Keine digitale Zuordnung an der Tafel.',
      liegt: ['Großes Partner-Symbol', 'Ein Satz zur Partnersuche', 'Keine Zuordnung oder Partnernummer'],
      entscheidungen: ['Wie werden die Partner gebildet (Sitznachbar, frei, feste Paare)?', 'Sind Dreiergruppen erlaubt?'] })
    : f('tps4', k, { vorlage: 'standard', standard: 'partner', phase: 'Pair', freigabe: 'lehrkraft', erklaerung: 'Die Schüler finden ihren Partner.',
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