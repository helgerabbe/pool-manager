// Folienkonzept (2026-10-21, überarbeitet): gemeinsame Sprache zwischen Methodenbeschreiber und Grafikassistent.
// Jede Folie und jedes Element einer Bauanleitung wird mit diesen Begriffen gekennzeichnet.
export const FOLIEN_KONZEPT = [
  { titel: 'Folienart', punkte: [
    ['Starre Folie', 'Zeigt nur etwas an, z. B. die Methodenfolie (erklärt die Methode) oder die Auftragsfolie (Arbeitsauftrag der Stunde). Analog und digital gleich.'],
    ['Aufgabenfolie', 'Die Schüler arbeiten mit der Folie. Auch die Sicherung ist eine Aufgabenfolie. Nur hier stellt sich die Frage analog oder digital.'],
  ] },
  { titel: 'Durchführung der Aufgabenfolie', punkte: [
    ['Analog', 'Die Folie zeigt nur, was die Klasse sehen muss: Auftrag, Regel, Zeit. Gearbeitet wird im Heft oder im Gespräch.'],
    ['Digital', 'Zusätzlich die Elemente, mit denen die Schüler auf ihrem Gerät arbeiten. Jedes dieser Elemente hat eine Funktion (siehe unten).'],
  ] },
  { titel: 'Art eines Elements', punkte: [
    ['Interaktiv', 'Schüler ↔ Folie: Der Schüler gibt etwas ein, zieht oder wählt aus.'],
    ['Kollaborativ', 'Nutzer ↔ Nutzer: Ein Ergebnis erscheint bei anderen (Lehrkraft, Partner, Gruppe, Klasse).'],
    ['Beides', 'Je nach Funktion allein oder im Team vernetzt, z. B. Reihenfolge oder Kanban-Board.'],
  ] },
  { titel: 'Funktion einer Interaktion: Was passiert mit der Eingabe?', punkte: [
    ['Übung', 'Es wird angezeigt, was richtig oder falsch ist: sofort (Selbstkontrolle) oder auf das Signal der Lehrkraft. Braucht eine hinterlegte Lösung.'],
    ['Präsentation', 'Die Lehrkraft sieht alle Eingaben, wählt einzelne aus und zeigt sie vorne, um darüber zu sprechen.'],
    ['Weiterführung allein', 'Die Eingabe wird in einer eigenen Folgeaufgabe wieder aufgegriffen. Angabe: wohin.'],
    ['Weiterführung in die Gruppe', 'Die Eingabe fließt im nächsten Schritt in die Gruppenarbeit ein, z. B. bei Pair. Angabe: wohin und Gruppenkennung.'],
    ['Weitergabe', 'Die Eingabe wandert zu einem anderen Schüler, der darauf aufbaut (Schreibgespräch, 6-3-5, Schreibkonferenz). Angabe: Takt oder Signal, Runden, Gruppenkennung.'],
    ['Rückmeldung', 'Andere kommentieren oder bewerten das Ergebnis (Galeriegang, Peer-Evaluation). Angabe: Form der Rückmeldung.'],
    ['Kollaboration', 'Mehrere arbeiten gleichzeitig an einem gemeinsamen Ergebnis, z. B. Live-Pinnwand oder Abstimmung. Angabe: Gruppenkennung.'],
  ] },
  { titel: 'Organisation des Foliensatzes (gilt für die ganze Stunde)', punkte: [
    ['Zuteilung', 'Partner, Gruppen, Rollen oder Seiten, fest, zufällig oder rotierend (Wechsel auf Signal oder im Takt). Schüler sehen sie über die Zuteilungsanzeige.'],
    ['Freigabe', 'Die nächste Folie gibt die Lehrkraft frei, sie öffnet sich automatisch oder wenn alle fertig sind.'],
    ['Ablauf', 'Folien fest hintereinander oder frei wählbar (z. B. Stationenlernen).'],
    ['Signale', 'Synchroner Timer, Fertig melden und Partnerbildung nach Fertig-Meldung (Lerntempoduett).'],
  ] },
  { titel: 'Sichtbarkeit (gilt für jedes Element)', punkte: [
    ['Sichtbar für', 'Alle, nur eine Rolle oder Gruppe (z. B. Information Gap, Tabu) oder je Schüler verschieden: Inhalte verteilen (Kettenquiz) oder mischen (Bingo).'],
    ['Ergebnisse', 'Die Ergebnisse der anderen erscheinen sofort oder erst nach Freigabe durch die Lehrkraft, damit niemand abschreibt oder sich der Mehrheit anschließt.'],
    ['Namen', 'Beiträge erscheinen mit Namen oder anonym (z. B. Anonymer Hut).'],
  ] },
  { titel: 'Inhalte: Wer legt sie fest? (gilt für jedes Element)', punkte: [
    ['Fest', 'Steht genau so auf der Folie, z. B. der Methodenname.'],
    ['Abfrage', 'Die Lehrkraft legt den Inhalt fest. Der Grafikassistent fragt nach oder lässt einen Platzhalter; Beispiele dienen nur der Orientierung.'],
    ['Frei', 'Ziel und Wirkung sind beschrieben, die Umsetzung entscheidet der Grafikassistent.'],
  ] },
  { titel: 'Grundsatz für die Gestaltung', punkte: [
    ['Funktion statt Layout', 'Die Bauanleitung nennt nur, welche Elemente es braucht und was sie leisten müssen. Anordnung, Größe und Farbe wählt der Grafikassistent.'],
    ['Ausnahme', 'Größe oder Farbe werden nur vorgegeben, wenn die Funktion davon abhängt (z. B. Timer aus der ganzen Klasse lesbar).'],
  ] },
];