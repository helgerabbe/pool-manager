// Folienkonzept (2026-10-21): gemeinsame Sprache zwischen Methodenbeschreiber und Grafikassistent.
// Jede Folie einer Bauanleitung wird mit diesen Begriffen gekennzeichnet.
export const FOLIEN_KONZEPT = [
  { titel: 'Folienart (Aufgabe der Folie)', punkte: [
    ['Methodenfolie', 'Erklärt die Methode selbst. Wiederverwendbar, in jeder Stunde gleich.'],
    ['Auftragsfolie', 'Trägt den Arbeitsauftrag der Stunde. Stundenbezogen, Inhalte setzt die Lehrkraft ein.'],
    ['Phasenfolie', 'Begleitet eine Phase der Methode (z. B. Timer, Regel, Symbol). Wiederverwendbares Muster, nur Zeit oder Modus variieren.'],
    ['Sicherungsfolie', 'Hält Ergebnisse fest. Stundenbezogen, oft optional.'],
  ] },
  { titel: 'Umsetzungsprofil (Wie viel passiert auf der Folie?)', punkte: [
    ['Starr', 'Reine Anzeige, nichts verändert sich.'],
    ['Dynamisch', 'Die Folie verändert sich im Ablauf (Timer, Einblendungen, übernommene Eingaben), ohne dass Schüler darauf einwirken.'],
    ['Interaktiv', 'Schüler wirken auf die Folie ein (Eingabe, Auswahl, Ziehen, Live-Pinnwand). Immer mit Einzel- oder Gruppenmodus.'],
  ] },
  { titel: 'Durchführung (analog oder digital)', punkte: [
    ['Analog', 'Die Folie zeigt nur, was die Klasse sehen muss, meist den Auftrag, die Regel und die Zeit. Gearbeitet wird im Heft oder im Gespräch.'],
    ['Digital', 'Zusätzlich die Elemente, mit denen die Schüler auf ihrem Gerät arbeiten. Jede Folie der Bauanleitung nennt beide Fälle, sofern sie sich unterscheiden.'],
  ] },
  { titel: 'Kennzeichnung von Texten', punkte: [
    ['Pflichttext', 'Steht wörtlich so auf der Folie, z. B. der Methodenname.'],
    ['Platzhalter', 'Hier setzt die Lehrkraft eigenen Inhalt ein. Das Beispiel dient nur der Orientierung und wird nicht übernommen.'],
    ['Freier Text', 'Sinn ist vorgegeben, die Formulierung wählt der Grafikassistent.'],
  ] },
  { titel: 'Grundsatz für die Gestaltung', punkte: [
    ['Funktion statt Layout', 'Die Bauanleitung nennt nur, welche Elemente es braucht und was sie leisten müssen. Anordnung, Größe und Farbe wählt der Grafikassistent.'],
    ['Ausnahme', 'Größe oder Farbe werden nur vorgegeben, wenn die Funktion davon abhängt (z. B. Timer aus der ganzen Klasse lesbar, fachlich festgelegte Farbe).'],
  ] },
];