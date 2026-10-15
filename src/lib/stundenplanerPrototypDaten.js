// BEISPIELDATEN des Stundenplaner-Prototyps (2026-10-15): statisch, keine KI, keine Speicherung.

export const BEISPIEL_VERLAUF = [
  { titel: 'Erster Zugang zur Kurzgeschichte „Das Brot“', lernziel: 'Handlung erfassen und erste Deutung formulieren' },
  { titel: 'Die Komplikation: Was passiert in der Küche wirklich?', lernziel: 'Wendepunkt und Konflikt benennen' },
  { titel: 'Kernaussage begründen', lernziel: 'Eine Deutung am Text belegen' },
];

export const FRAGEN = [
  { frage: 'Was sollen die Schüler am Ende der Stunde können?', warum: 'Daran richtet sich der ganze Verlauf aus.',
    vorschlaege: ['Den Konflikt in eigenen Worten erklären', 'Eine Deutung mit Textstelle belegen', 'Figurenverhalten begründet bewerten'] },
  { frage: 'Wie ist die Lerngruppe heute drauf?', warum: 'Danach wähle ich, wie viel Ruhe oder Bewegung die Stunde braucht.',
    vorschlaege: ['Eher unruhig', 'Konzentriert und arbeitsfähig', 'Sehr unterschiedlich stark'] },
  { frage: 'Was wurde in der letzten Stunde gemacht?', warum: 'So knüpft der Einstieg sinnvoll an.',
    vorschlaege: ['Text gelesen, Inhalt gesichert', 'Noch nichts zum Text', 'Hausaufgabe zum Text aufgegeben'] },
];

const p = (name, minuten, aktivitaet, sozialform) => ({ name, minuten, aktivitaet, sozialform });

export const FASSUNGEN = {
  standard: {
    name: 'Standardstunde', kurz: 'Bewährt und gut machbar', aufwand: 1,
    phasen: [
      p('Einstieg', 5, 'Kurze Wiederholung: Worum ging es in „Das Brot“? Zwei Schüler fassen zusammen.', 'Plenum'),
      p('Erarbeitung', 15, 'Arbeitsblatt: Die Küchenszene markieren – Was sagt die Frau, was denkt sie?', 'Einzelarbeit'),
      p('Sicherung', 15, 'Ergebnisse vergleichen, Tafelbild „Gesagtes und Gemeintes“ gemeinsam füllen.', 'Plenum'),
      p('Abschluss', 5, 'Ein Satz ins Heft: Warum lügt die Frau?', 'Einzelarbeit'),
    ],
    vorbereitung: {
      material: ['Arbeitsblatt Küchenszene (30 Kopien)', 'Tafelbild-Skizze vorab notieren'],
      vorher: ['Textstelle Z. 40–70 selbst einmal markieren'],
      stolpersteine: [{ problem: 'Die Sicherung zieht sich in die Länge.', tipp: 'Nur drei Beispiele sammeln, den Rest im Heft ergänzen lassen.' }],
    },
  },
  kniff: {
    name: 'Mit kleinem Kniff', kurz: 'Ein neuer Einstieg zum Ausprobieren', aufwand: 2,
    hinweis: 'Neu: Stummer Impuls statt Wiederholung.',
    phasen: [
      p('Einstieg', 7, 'Stummer Impuls: Ein Foto eines Brotkorbs um Mitternacht an der Tafel – ohne Worte. Schüler äußern Vermutungen.', 'Plenum'),
      p('Erarbeitung', 15, 'Arbeitsblatt: Die Küchenszene markieren – Was sagt die Frau, was denkt sie?', 'Einzelarbeit'),
      p('Sicherung', 13, 'Ergebnisse vergleichen, Tafelbild „Gesagtes und Gemeintes“ gemeinsam füllen.', 'Plenum'),
      p('Abschluss', 5, 'Zurück zum Foto: Was wissen wir jetzt über das Bild?', 'Plenum'),
    ],
    vorbereitung: {
      material: ['Foto für den stummen Impuls (Beamer oder Ausdruck)', 'Arbeitsblatt Küchenszene (30 Kopien)'],
      vorher: ['Überlegen, wie lange du schweigst (ca. 1 Minute aushalten!)'],
      stolpersteine: [
        { problem: 'Die Klasse bleibt still, weil sie den Impuls nicht kennt.', tipp: 'Vorher ankündigen: „Ich sage gleich nichts – schaut genau hin.“' },
        { problem: 'Vermutungen schweifen ab.', tipp: 'Zwei Vermutungen an die Tafel, dann direkt zum Text überleiten.' },
      ],
    },
  },
  aufwendig: {
    name: 'Abwechslungsreiche Alternative', kurz: 'Mehr Aktivität, mehr Vorbereitung', aufwand: 3,
    hinweis: 'Neu: Rollenkarten und Standbild.',
    phasen: [
      p('Einstieg', 5, 'Stummer Impuls mit Foto, Vermutungen sammeln.', 'Plenum'),
      p('Erarbeitung', 15, 'Gruppen erhalten Rollenkarten (Frau / Mann) und schreiben einen inneren Monolog.', 'Gruppenarbeit'),
      p('Präsentation', 12, 'Zwei Gruppen stellen ein Standbild der Küchenszene, andere sprechen die Gedanken.', 'Plenum'),
      p('Sicherung', 8, 'Gemeinsam: Was verrät das Standbild über die Kernaussage?', 'Plenum'),
    ],
    vorbereitung: {
      material: ['Rollenkarten für 6 Gruppen', 'Foto für den Impuls', 'Platz im Raum für das Standbild'],
      vorher: ['Gruppen vorab einteilen', 'Tische so stellen, dass vorne Platz ist', 'Ablauf des Standbilds einmal selbst durchdenken'],
      stolpersteine: [
        { problem: 'Gruppen werden nicht rechtzeitig fertig.', tipp: 'Nach 10 Minuten eine Zwei-Minuten-Warnung geben.' },
        { problem: 'Das Standbild wird albern.', tipp: 'Klare Regel: Einfrieren auf Kommando, 20 Sekunden ohne Sprechen.' },
        { problem: 'Zuschauende Gruppen sind passiv.', tipp: 'Jeder Zuschauer bekommt eine Beobachtungsfrage.' },
      ],
    },
  },
};

export const UMSETZUNG_STUFEN = [
  { key: 'analog', name: 'Rein analog', text: 'Du bekommst einen Stundenverlaufsplan zum Ausdrucken.' },
  { key: 'teil', name: 'Digital unterstützt', text: 'Einzelne Phasen (z. B. Einstieg oder Aufgabe) laufen über die Geräte.' },
  { key: 'digital', name: 'Weitgehend digital', text: 'Tafel und Aufgaben laufen digital, Schüler arbeiten am Tablet.' },
];