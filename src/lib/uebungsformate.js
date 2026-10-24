// Übungsformate (2026-10-24): eigener Bereich neben Standardfolien und Layoutvorlagen.
// Ein Übungsformat füllt die Leerstelle einer Rahmenfolie.
// digital: Tablet-Ansicht + Tafel-Arbeitsauftrag (umschaltbar zur interaktiven Tafel).
// analog: Übung an der Tafel; Tablets zeigen nur den Hinweis nach vorne.
export const ANALOG_HINWEIS = 'Wir lösen gerade etwas gemeinsam an der Tafel. Bitte richte deine Aufmerksamkeit dorthin.';

export const UEBUNGSFORMATE = [
  { key: 'lueckentext', name: 'Lückentext', digital: true, analog: true,
    folie: { vorlage: 'phase', folientyp: 'aufgabe', titel: 'Fülle die Lücken', sozialform: 'EA', leise: true, minuten: 5, methodisch: 'Arbeite allein und leise.', inhalt: 'Ergänze die Lücken im Text mit den Wörtern aus dem Wortspeicher.' },
    tablet: 'Text mit Lücken, darunter der Wortspeicher; Wort antippen, dann Lücke antippen.',
    tafel_digital: 'Arbeitsauftrag: Titel, Arbeitsweise, Auftrag, Timer. Per Knopf umschaltbar zur interaktiven Tafel.',
    tafel_analog: 'Text groß an der Tafel, Wort antippen, dann Lücke antippen. Knöpfe: Lösung prüfen, Zufallsschüler, Neu beginnen.' },
  { key: 'notizen', name: 'Eigene Notizen machen', digital: true, analog: false },
  { key: 'satzanfaenge', name: 'Satzanfänge ergänzen', digital: true, analog: false },
];