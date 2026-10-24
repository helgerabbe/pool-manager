// Übungsformate (2026-10-24): eigener Bereich neben Standardfolien und Layoutvorlagen.
// Ein Übungsformat füllt die Leerstelle einer Rahmenfolie.
// digital: Tablet-Ansicht + Tafel-Arbeitsauftrag (umschaltbar zur interaktiven Tafel).
// analog: Übung an der Tafel; Tablets zeigen nur den Hinweis nach vorne.
export const ANALOG_HINWEIS = 'Wir lösen gerade etwas gemeinsam an der Tafel. Bitte richte deine Aufmerksamkeit dorthin.';

// Noch aus dem Pool-Manager-Katalog zu übernehmende Formate (nur Übersicht, noch ohne Skizze).
export const NOCH_OFFEN = [
  'Materialaufgabe', 'Offene Aufgabe',
  'KI-Quiz', 'KI-Check', 'KI-Tutor Aufgabe (Brian)', 'Aufgabensequenz', 'Test', 'Bearbeitung bestätigen',
  'Text lesen', 'Video / Audio', 'Slideshow', 'Kompaktwissen', 'Lehrwerk/Quelle', 'Link / URL', 'Externer Inhalt',
];

export const UEBUNGSFORMATE = [
  { key: 'lueckentext', name: 'Lückentext', digital: true, analog: true,
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Fülle die Lücken', sozialform: 'EA', leise: true, minuten: 5, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Ergänze die Lücken im Text mit den Wörtern aus dem Wortspeicher.' },
    tablet: 'Text mit Lücken, darunter der Wortspeicher; Wort antippen, dann Lücke antippen.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Text groß an der Tafel, Wort antippen, dann Lücke antippen. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'zuordnen', name: 'Begriffe zuordnen', digital: true, analog: true,
    tafel_analog: 'Erklärungen groß an der Tafel, Begriff antippen, dann Erklärung antippen. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.', tablet_vorlage: 'zuordnen',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Was passt zusammen?', sozialform: 'EA', leise: true, minuten: 5, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Ordne jedem Begriff die passende Erklärung zu.' },
    tablet: 'Erklärungen untereinander, darunter die Begriffe; Begriff antippen, dann die passende Erklärung antippen. Erneut antippen tauscht, „Neu“ setzt zurück.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.' },
  { key: 'reihenfolge', name: 'Reihenfolge sortieren', digital: true, analog: true, tablet_vorlage: 'reihenfolge',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Bring es in die richtige Reihenfolge', sozialform: 'EA', leise: true, minuten: 5, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Sortiere die Schritte in die richtige Reihenfolge.' },
    tablet: 'Nummerierte Karten untereinander; mit den Pfeilen nach oben oder unten schieben, „Neu“ mischt zurück.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Karten groß an der Tafel, mit Pfeilen verschieben. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'richtig_falsch', name: 'Richtig oder falsch', digital: true, analog: true, tablet_vorlage: 'richtig_falsch',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Stimmt das?', sozialform: 'EA', leise: true, minuten: 4, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Entscheide bei jeder Aussage: richtig oder falsch?' },
    tablet: 'Aussagen untereinander; je Aussage „Richtig“ oder „Falsch“ antippen, „Neu“ setzt zurück.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Aussagen groß an der Tafel, je Aussage Richtig oder Falsch antippen. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'multiple_choice', name: 'Multiple Choice', digital: true, analog: true, tablet_vorlage: 'multiple_choice',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Was ist richtig?', sozialform: 'EA', leise: true, minuten: 4, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Wähle bei jeder Frage die richtige Antwort.' },
    tablet: 'Fragen untereinander, je vier Antworten als Kacheln; eine Antwort antippen, „Neu“ setzt zurück.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Eine Frage groß an der Tafel, Antworten als Kacheln, mit Pfeilen zur nächsten Frage. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'bildbeschriftung', name: 'Bildbeschriftung', digital: true, analog: true, tablet_vorlage: 'bildbeschriftung',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Beschrifte das Bild', sozialform: 'EA', leise: true, minuten: 4, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Ordne jeder Nummer im Bild den passenden Begriff zu.' },
    tablet: 'Bild mit nummerierten Markierungen, daneben die Begriffe; Begriff antippen, dann Markierung antippen. „Neu“ setzt zurück.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Bild groß an der Tafel, Begriff antippen, dann Markierung antippen. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'zuordnungstraining', name: 'Zuordnungstraining', digital: true, analog: false, tablet_vorlage: 'zuordnungstraining',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Trainiere die Paare', sozialform: 'EA', leise: true, minuten: 8, schritt: 1, schritte: 3, methodisch: 'Arbeite allein und leise.', inhalt: 'Ordne jedem Begriff die richtige Bedeutung zu, bis alles sitzt.' },
    tablet: 'Ein Begriff groß, darunter vier Antworten; jedes Paar muss zweimal richtig sein, ein Fehler setzt es zurück. Geübt wird in Runden zu je vier Paaren, ein Balken zeigt, wie viele sitzen.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer.' },
  { key: 'sprechaufgabe', name: 'Sprechaufgabe', digital: true, analog: false, tablet_vorlage: 'sprechaufgabe',
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Sprich es aus', sozialform: 'EA', leise: false, minuten: 5, schritt: 1, schritte: 3, methodisch: 'Arbeite allein, sprich leise in dein Gerät.', inhalt: 'Nimm deine Antwort auf. Du bekommst sofort eine Rückmeldung.' },
    tablet: 'Aufgabe oben, darunter ein großes Mikrofon; antippen startet, erneut antippen stoppt die Aufnahme. Danach zeigt die KI, was gelungen ist und was fehlt; begrenzte Versuche.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer.' },
  { key: 'notizen', name: 'Eigene Notizen machen', digital: true, analog: false },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', digital: true, analog: false },
];