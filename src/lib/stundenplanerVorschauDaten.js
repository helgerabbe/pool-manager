/** Beispielinhalte für die klickbare Vorschau des Stundenplaners (ohne KI). */
export const SCHRITTE = ['Abschnitt wählen', 'Rahmen klären', 'Prüfung', 'Grobentwurf', 'Feinplanung'];

export const PRUEFUNG = {
  ampel: 'bedingt',
  satz: 'Ein induktiver Einstieg in 40 Minuten ist möglich, wird aber knapp: Für eigenes Entdecken und eine Sicherung im Plenum bleibt kaum Übungszeit.',
  entscheidungen: [
    { frage: 'Wie gehen wir mit der Zeit um?', optionen: ['Doppelstunde nehmen', 'Bei 40 Min. bleiben – zügig arbeiten', 'Übung als selbstständige Übung auslagern'] },
    { frage: 'Dein Arbeitsblatt passt nur teilweise. Was tun?', optionen: ['Unbedingt einbauen', 'Nur als Zusatz nutzen', 'Weglassen'] },
  ],
};

export const GROBENTWURF = [
  {
    titel: 'Einstieg: Das rätselhafte Dreieck', minuten: 5, sozialform: 'Plenum', art: 'Lehrkraft-Impuls',
    idee: 'Ein Bild einer Leiter an einer Hauswand: Wie lang muss die Leiter sein? Die Schüler schätzen.',
    analyse: 'Bedeutsamkeit: Alltagsproblem statt Formel. Die Frage erzeugt einen echten Grund, eine Regel zu suchen. Anschluss an das Vorwissen: rechtwinklige Dreiecke und Flächen von Quadraten.',
  },
  {
    titel: 'Erarbeitung: Quadrate an den Seiten', minuten: 15, sozialform: 'Partnerarbeit', art: 'Digitale Entdeckung',
    idee: 'Die Schüler verändern ein Dreieck am Bildschirm und beobachten die Flächen der drei Quadrate. Sie notieren eine Vermutung.',
    analyse: 'Gedankliche Operation: Zusammenhang zwischen Größen entdecken und als Vermutung formulieren (induktiv). Methode: Partnerarbeit, damit Vermutungen sprachlich ausgehandelt werden.',
  },
  {
    titel: 'Sicherung: Vom Muster zur Regel', minuten: 8, sozialform: 'Plenum', art: 'Gemeinsame Sicherung',
    idee: 'Vermutungen sammeln, zur Regel a² + b² = c² verdichten, Merksatz ins Heft.',
    analyse: 'Hier wird die entdeckte Struktur fachsprachlich gefasst. Ohne diese Phase bleibt die Entdeckung folgenlos.',
  },
  {
    titel: 'Anwendung: Zurück zur Leiter', minuten: 12, sozialform: 'Einzelarbeit', art: 'Digitale Übung',
    idee: 'Gestufte Anwendungsaufgaben mit Rückmeldung – beginnend mit der Leiter aus dem Einstieg.',
    analyse: 'Gedankliche Operation: Rechtwinklige Situation erkennen, Hypotenuse bestimmen, Regel anwenden. Bewusst kein Lückentext: Die Schüler müssen selbst rechnen.',
  },
];

export const FEINPLANUNG = [
  { phase: 'Einstieg', methode: 'Stummer Impuls', umsetzung: 'Beamer', aktivitaet: 'Bild mit Impulsfrage',
    ablauf: 'Wir zeigen wortlos das Bild der Leiter an der Hauswand. Die Schüler äußern Vermutungen, wie lang die Leiter sein muss.',
    begruendung: 'Ein starkes Bild genügt – keine Interaktion nötig, die Diskussion passiert im Raum.' },
  { phase: 'Erarbeitung', methode: 'Think-Pair-Share', umsetzung: 'digital', aktivitaet: 'Offene Aufgabe (interaktive Konstruktion)',
    ablauf: 'Erst verändert jeder allein das Dreieck und notiert ein Muster, dann vergleichen wir zu zweit, zum Schluss tragen einzelne Paare vor.',
    begruendung: 'Nur wenn die Schüler das Dreieck selbst verändern, können sie den Zusammenhang entdecken.' },
  { phase: 'Sicherung', methode: 'Tafelbild gemeinsam entwickeln', umsetzung: 'analog', aktivitaet: 'Merksatz an der Tafel',
    ablauf: 'Wir sammeln die Vermutungen an der Tafel und verdichten sie gemeinsam zur Regel a² + b² = c². Die Schüler übertragen den Merksatz ins Heft.',
    begruendung: 'Die Regel entsteht im Gespräch – digital würde das abkürzen.' },
  { phase: 'Anwendung', methode: 'Tandembogen / Partnerkontrolle', umsetzung: 'digital', aktivitaet: 'Test mit gestuften Rechenaufgaben',
    ablauf: 'Die Schüler rechnen die gestuften Aufgaben und bekommen sofort Rückmeldung. Wer fertig ist, kontrolliert mit einem Partner die Lösungswege.',
    begruendung: 'Die Schüler wenden die Regel an und bekommen sofort Rückmeldung. Ein Lückentext würde nur den Merksatz abfragen.' },
];

/** Materialien, die fest in der Stunde verwendet werden (Vorgaben der Lehrkraft + übernommene Funde). */
export const FESTE_MATERIALIEN = [
  { name: 'Arbeitsblatt „Pythagoras entdecken“ (deine Vorgabe)', phase: 'Erarbeitung', herkunft: 'vorgabe' },
  { name: 'Lehrbuch S. 112, Aufgaben 3–6', phase: 'Anwendung', herkunft: 'vorgabe' },
  { name: 'Studyflix-Video „Satz des Pythagoras“', phase: 'Anwendung', herkunft: 'internet' },
];