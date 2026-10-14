// Einsatzempfehlung (Probe 2026-10-14): Auf welcher Ebene lohnt sich Einführung und Nutzung?
export const EINSATZ_STUFEN = {
  1: { label: 'Unkompliziert einsetzbar', cls: 'bg-green-100 text-green-900', text: 'Schnell erklärt, ohne großen Vorlauf, jederzeit wieder nutzbar.' },
  2: { label: 'Ritualisierung empfohlen', cls: 'bg-teal-100 text-teal-900', text: 'Einmal eingeübt, entfaltet die Methode als wiederkehrendes Ritual ihren vollen Nutzen.' },
  3: { label: 'Individuell einsetzbar', cls: 'bg-sky-100 text-sky-900', text: 'Allein vorzubereiten und im eigenen Unterricht sinnvoll, auch bei seltenem Einsatz.' },
  4: { label: 'Gemeinsam empfohlen', cls: 'bg-orange-100 text-orange-900', text: 'Lohnt sich vor allem mit ein, zwei Kolleg:innen: Material und Erfahrungen teilen.' },
  5: { label: 'Fachschaftsprojekt empfohlen', cls: 'bg-rose-100 text-rose-900', text: 'Hoher Aufwand: am besten über die Fachschaft mit Absprachen, Materialpool und Fortbildung.' },
};

// Probe: die ersten zehn Methoden aus „Einstieg & Aktivierung“.
import { EINSATZ_ERGAENZUNG } from '@/lib/methodenEinsatzErgaenzung';

export const EINSATZ_PROBE = {
  ...EINSATZ_ERGAENZUNG,
  'Stummer Impuls': { stufe: 1, begruendung: 'Ein Bild oder Gegenstand genügt, die Schüler kennen das Vorgehen sofort.' },
  'Provokante These': { stufe: 1, begruendung: 'Eine These an der Tafel reicht; die Gesprächsführung trägt die Methode.' },
  'Problemaufriss / Schätzfrage': { stufe: 2, begruendung: 'Als regelmäßige „Schätzfrage der Woche“ ein starkes Ritual mit kaum Vorbereitung.' },
  'Wortwolke': { stufe: 2, begruendung: 'Nach einmaliger Einrichtung des Werkzeugs in Sekunden wiederholbar, gut als Stundenauftakt.' },
  'Brainstorming / Mindmap': { stufe: 1, begruendung: 'Allen bekannt, ohne Material sofort durchführbar.' },
  'Kartenabfrage': { stufe: 3, begruendung: 'Braucht Karten, Zeit und Clustern; allein gut planbar, aber nicht für jede Stunde.' },
  'Positionslinie / Meinungsbarometer': { stufe: 2, begruendung: 'Wird schneller, je öfter die Klasse sie kennt; gut als wiederkehrender Einstieg.' },
  'Vier-Ecken-Methode': { stufe: 3, begruendung: 'Etwas Raumorganisation und vorbereitete Positionen; eigenständig gut umsetzbar.' },
  'Zwillingsfindung': { stufe: 4, begruendung: 'Kartensätze sind aufwendig; geteilte Sätze in der Fachgruppe machen sie wirtschaftlich.' },
  'Gedankenexperiment': { stufe: 3, begruendung: 'Ein gut gewähltes Szenario will vorbereitet sein; allein gut machbar.' },
};