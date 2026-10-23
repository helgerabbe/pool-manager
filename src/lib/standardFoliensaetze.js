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
    ? f('tps4', k, { vorlage: 'partnersuche', partnersuche: 'frei', titel: 'Partner finden', phase: 'Pair', freigabe: 'lehrkraft',
      erklaerung: 'Analoge Standardfolie: Die Schüler finden ohne Gerät einen Partner. Die Art der Suche legt die Lehrkraft fest.',
      liegt: ['Aquarellbild zur gewählten Art der Partnersuche', 'Name der Art und ein fester Satz', 'Keine Zuordnung oder Partnernummer'],
      entscheidungen: ['Wie finden die Schüler ihren Partner: frei, Sitznachbar, Losen oder Lerntempo-Duett?', 'Sind Dreiergruppen erlaubt?'] })
    : f('tps4', k, { vorlage: 'standard', standard: 'partner', phase: 'Pair', freigabe: 'lehrkraft', erklaerung: 'Die Schüler finden ihren Partner.',
      liegt: ['Standardfolie „Partner finden“', 'Partnernummer je Paar'],
      entscheidungen: ['Wie werden die Partner gebildet (Sitznachbar, zufällig, feste Paare)?', 'Sind Dreiergruppen erlaubt?'] }),
  f('tps5', k, { vorlage: 'phase', titel: 'Phase 2: Pair', phase: 'Pair', sozialform: 'PA', minuten: 7, freigabe: 'zeit', fluestern: true,
    methodisch: 'Erzählt euch gegenseitig eure Ideen. Sprecht dabei mit Flüsterstimme.',
    inhalt: 'Einigt euch auf die drei wichtigsten Gründe, warum Menschen mit ihrem Beruf unzufrieden sind, und haltet sie fest.',
    erklaerung: 'Austausch zu zweit mit Timer. Oben die methodische Anweisung (gleich bei jeder Pair-Phase), darunter groß die inhaltliche Aufgabe zum Thema.',
    liegt: ['Methodische Anweisung im grauen Streifen „So arbeitest du“ (feststehend)', 'Inhaltliche Aufgabe in der Aufgabenbox (zum Thema der Stunde)', 'Flüsterstimme-Zeichen, Sozialform und Timer oben rechts'],
    entscheidungen: [
      'Art des Arbeitsauftrags: Wird derselbe Auftrag wie in der Think-Phase gemeinsam weiterbearbeitet, oder ist es ein Einigungsprozess?',
      'Bei Einigung: Auf wie viele Aspekte sollen sich die Paare einigen?',
      'Wie lautet der genaue inhaltliche Arbeitsauftrag (kurz oder ausführlich)?',
      'Wie lange dauert die Pair-Phase?',
      'Wie halten die Paare ihr Ergebnis fest?',
    ] }),
  f('tps6', k, { vorlage: 'phase', titel: 'Phase 3: Share', phase: 'Share', sozialform: 'PL', freigabe: 'lehrkraft',
    methodisch: 'Hört einander aufmerksam zu. Meldet euch, wenn ihr etwas ergänzen möchtet.',
    inhalt: 'Stellt eure drei wichtigsten Gründe vor. Wir besprechen sie gemeinsam und sammeln sie an der Tafel.',
    erklaerung: 'Methodenfolie der Share-Phase im Plenum. Oben die Arbeitsweise, darunter der klare Auftrag, was gemeinsam besprochen wird.',
    liegt: ['Methodische Anweisung im grauen Streifen „So arbeitest du“ (Arbeitsweise im Plenum)', 'Inhaltliche Aufgabe in der Aufgabenbox (was vorgestellt und besprochen wird)', 'Plenum-Symbol oben rechts'],
    entscheidungen: ['Wie lautet der genaue Auftrag für das Plenum (vorstellen, vergleichen, sammeln, bewerten)?', 'Wer stellt vor (freiwillig, ausgelost, alle Paare)?', 'Welcher Hinweis zur Arbeitsweise gilt (zuhören, melden, ergänzen)?'] }),
  f('tps7', k, { vorlage: 'sammlung', titel: 'Unsere Sammlung', frage: 'Warum sind Menschen mit ihrem Beruf unzufrieden?', phase: 'Share', freigabe: 'lehrkraft',
    erklaerung: 'Klassische Lehrersicherung: Während die Schüler vortragen, schreibt die Lehrkraft live mit. Noch keine Einigung, nur Sammeln. Kein Merksatz.',
    liegt: ['Überschrift und Leitfrage der Sammlung', 'Offenes Textfeld, in das die Lehrkraft während der Vorträge tippt', 'Die Einträge erscheinen als Liste (zweispaltig bei vielen Punkten)'],
    entscheidungen: ['Wie lautet die Leitfrage der Sammlung?', 'Soll ein Erwartungshorizont als Spickzettel nur auf dem Lehrergerät bereitliegen?'] }),
];

// Konvergierende Fassung (2026-10-23): gleiche Folienfolge, Ziel ist eine Einigung statt einer Sammlung.
const KONVERGENT = {
  tps1: { untertitel: 'Erst allein entscheiden, dann zu zweit einigen, dann alle gemeinsam',
    phasen: [
      { name: 'Think', sozialform: 'EA', satz: 'Du entscheidest allein, was dir am wichtigsten ist.' },
      { name: 'Pair', sozialform: 'PA', satz: 'Ihr vergleicht und einigt euch auf eine Rangfolge.' },
      { name: 'Share', sozialform: 'PL', satz: 'Die Klasse einigt sich auf ein gemeinsames Ergebnis.' },
    ] },
  tps3: { inhalt: 'Welche drei Gründe sind für dich die wichtigsten? Bringe sie in eine Rangfolge von 1 bis 3.',
    erklaerung: 'Stille Einzelarbeit mit Timer: Jeder gewichtet bzw. entscheidet für sich, bevor verhandelt wird.',
    entscheidungen: ['Was wird gewichtet bzw. entschieden (z. B. die Sammlung der letzten Phase)?', 'Wie viele Aspekte wählt jeder aus, mit oder ohne Rangfolge?', 'Wie lange dauert die Think-Phase?'] },
  tps5: { methodisch: 'Vergleicht eure Rangfolgen und begründet eure Wahl. Sprecht dabei mit Flüsterstimme.',
    inhalt: 'Einigt euch auf eine gemeinsame Rangfolge der drei wichtigsten Gründe und haltet sie fest.',
    erklaerung: 'Einigung zu zweit mit Timer: Aus zwei Einzelentscheidungen wird eine gemeinsame.',
    entscheidungen: ['Auf wie viele Aspekte sollen sich die Paare einigen?', 'Mit Rangfolge oder nur Auswahl?', 'Wie lange dauert die Pair-Phase?', 'Wie halten die Paare ihr Ergebnis fest?'] },
  tps6: { methodisch: 'Begründet eure Rangfolge. Hört zu und meldet euch, wenn ihr widersprechen oder ergänzen möchtet.',
    inhalt: 'Stellt eure Rangfolge vor. Wir vergleichen sie und einigen uns als Klasse auf die drei wichtigsten Gründe.',
    erklaerung: 'Methodenfolie der Share-Phase: Die Paar-Ergebnisse werden verglichen, bis die Klasse sich einig ist.',
    entscheidungen: ['Wie wird im Plenum geeinigt (Diskussion, Abstimmung, Lehrkraft moderiert)?', 'Wer stellt vor (freiwillig, ausgelost, alle Paare)?'] },
  tps7: { vorlage: 'sicherung', titel: 'Darauf haben wir uns geeinigt',
    punkte: ['Wichtigster Grund', 'Zweitwichtigster Grund', 'Drittwichtigster Grund'],
    erklaerung: 'Konvergierendes Ergebnis: Die Einigung der Klasse wird als Merksatz festgehalten.',
    liegt: ['Merksatz-Box (gelb) mit bis zu vier Stichpunkten in Rangfolge'],
    entscheidungen: ['Wird das Ergebnis live eingetragen oder liegt ein Erwartungshorizont bereit?'] },
};
const tpsKonvergent = (k) => tps(k).map((x) => (KONVERGENT[x.id] ? { ...x, ...KONVERGENT[x.id] } : x));

// Weiche: divergierend (öffnend, Ideen sammeln) oder konvergierend (schließend, sich einigen).
export const ZIELE = [['divergierend', 'Divergierend · Ideen sammeln'], ['konvergierend', 'Konvergierend · sich einigen']];

export const STANDARD_FOLIENSAETZE = {
  'Think-Pair-Share': {
    divergierend: { digital: tps('digital'), analog: tps('analog') },
    konvergierend: { digital: tpsKonvergent('digital'), analog: tpsKonvergent('analog') },
  },
};

export const hatZielWeiche = (name) => !!STANDARD_FOLIENSAETZE[name]?.konvergierend;

export const standardSatz = (name, kanal, ziel = 'divergierend') => {
  const s = STANDARD_FOLIENSAETZE[name]?.[ziel]?.[kanal];
  return s ? { thema: '', standard: true, folien: s } : null;
};