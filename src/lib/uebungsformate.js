// Übungsformate (2026-10-24): eigener Bereich neben Standardfolien und Layoutvorlagen.
// Ein Übungsformat füllt die Leerstelle einer Rahmenfolie.
// digital: Tablet-Ansicht + Tafel-Arbeitsauftrag (umschaltbar zur interaktiven Tafel).
// analog: Übung an der Tafel; Tablets zeigen nur den Hinweis nach vorne.
export const ANALOG_HINWEIS = 'Wir lösen gerade etwas gemeinsam an der Tafel. Bitte richte deine Aufmerksamkeit dorthin.';

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
  { key: 'notizen', name: 'Eigene Notizen machen', digital: true, analog: false },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', digital: true, analog: false },
];