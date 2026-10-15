// BEISPIELDATEN des Stundenplaner-Prototyps (2026-10-15): statisch, keine KI, keine Speicherung.

export const BEISPIEL_VERLAUF = [
  { titel: 'Erster Zugang zur Kurzgeschichte „Das Brot“', lernziel: 'Handlung erfassen und erste Deutung formulieren' },
  { titel: 'Die Komplikation: Was passiert in der Küche wirklich?', lernziel: 'Wendepunkt und Konflikt benennen' },
  { titel: 'Kernaussage begründen', lernziel: 'Eine Deutung am Text belegen' },
];

export const WEITERE_STUNDEN = [
  { titel: 'Merkmale der Kurzgeschichte', lernziel: 'Gattungsmerkmale am Text nachweisen' },
  { titel: 'Erzählperspektive und Wirkung', lernziel: 'Erzählweise beschreiben und ihre Wirkung erklären' },
  { titel: 'Sprachliche Mittel: Wiederholung und Andeutung', lernziel: 'Sprachliche Mittel als Deutungshilfe nutzen' },
  { titel: 'Interpretationsaufsatz vorbereiten', lernziel: 'Eine Deutungshypothese aufbauen' },
];

export const ANALYSE_FRAGEN = [
  { frage: 'Arbeitet ihr mit einem festen Text?', warum: 'Ohne Text kann ich den Inhalt der Stunde nicht genau bestimmen.',
    vorschlaege: ['Ja, „Das Brot“ von Borchert', 'Ja, aber ein anderer Text', 'Noch offen – schlag einen vor'] },
  { frage: 'Kennen die Schüler den Text schon?', warum: 'Davon hängt ab, ob die Stunde mit dem Lesen beginnt.',
    vorschlaege: ['Ja, ganz gelesen', 'Nur den Anfang', 'Nein, noch gar nicht'] },
];

export const ANALYSE = {
  aspekte: [
    'Die Frau ertappt ihren Mann nachts in der Küche – er hat heimlich Brot gegessen.',
    'Beide lügen, um den anderen nicht bloßzustellen: Das Gesagte verdeckt das Gemeinte.',
    'Der Konflikt entsteht aus Hunger und Not der Nachkriegszeit, nicht aus Bosheit.',
    'Die Frau verzichtet am nächsten Abend auf eine Scheibe – Mitgefühl statt Vorwurf.',
  ],
  sachanalyse: '„Das Brot“ (Wolfgang Borchert, 1946) zeigt ein altes Ehepaar in der Nachkriegszeit. Der Wendepunkt liegt in der nächtlichen Küchenszene: Die Frau bemerkt Krümel und Messer, der Mann behauptet, ein Geräusch gehört zu haben. Beide wissen, dass er lügt, doch die Frau stützt die Lüge. Die Kurzgeschichte lebt von Andeutungen: Was die Figuren sagen, ist kaum wichtig, entscheidend ist, was sie verschweigen. Am Ende schiebt die Frau ihrem Mann eine ihrer Brotscheiben zu – ein stiller Akt der Liebe. Für Jahrgang 9 bietet sich an, über die Leitfrage „Warum lügt die Frau?“ zur Kernaussage zu kommen: Menschlichkeit zeigt sich gerade im Verzeihen.',
};

export const ANALYSE_NEU = {
  aspekte: [
    'Im Mittelpunkt steht das Verhalten der Frau: Sie durchschaut die Lüge sofort.',
    'Ihre Gegenlüge („Ich dachte, hier wäre was“) schützt die Würde des Mannes.',
    'Die Geste am Ende (Brotscheibe abgeben) ist die eigentliche Antwort auf die Lüge.',
  ],
  sachanalyse: ANALYSE.sachanalyse,
};

// Vorschlag zum Stundentyp (Schlüssel aus STUNDEN_MODELLE, src/lib/stundenModelle.js)
export const STUNDENTYP = {
  vorschlag: 'induktiv',
  begruendung: 'Die Schüler sollen die Kernaussage selbst am Text entdecken – nicht vorgesagt bekommen. Das spricht für eine induktive Erarbeitung.',
  alternativen: [
    { key: 'deduktiv', wann: 'Wenn es schneller gehen soll: Du gibst die Deutung vor, die Schüler belegen sie.' },
    { key: 'vertieft', wann: 'Wenn die Deutung schon steht und die Schüler etwas daraus gestalten sollen.' },
    { key: 'uebung_mittel', wann: 'Wenn der Text schon besprochen ist und das Belegen geübt werden soll.' },
  ],
};

export const MODELL_ERKLAERUNG = {
  induktiv: 'Vom Beispiel zur Regel: Die Schüler stoßen auf etwas Rätselhaftes, beobachten, vermuten und finden die Erkenntnis selbst. Du lenkst, verrätst aber nichts vorab.',
  deduktiv: 'Von der Regel zum Beispiel: Du erklärst zuerst, worum es geht. Danach wenden die Schüler das Gelernte an – erst mit Hilfe, dann selbstständig.',
  vertieft: 'Die Grundlagen sind da. Die Schüler arbeiten an einer anspruchsvolleren Aufgabe und erstellen ein Produkt, das sie vergleichen und vorstellen.',
  uebung_mittel: 'Nichts Neues wird erarbeitet. Die Schüler üben selbstständig, bekommen eine Rückmeldung und wissen am Ende, wo sie stehen.',
};

export const ZIELE = {
  haupt: 'Die Schüler erklären, warum die Frau die Lüge ihres Mannes deckt, und belegen ihre Deutung am Text.',
  alternativen: [
    'Die Schüler unterscheiden zwischen dem, was die Figuren sagen, und dem, was sie meinen.',
    'Die Schüler beschreiben die Situation der Figuren vor dem Hintergrund der Nachkriegszeit.',
    'Die Schüler bewerten das Verhalten der Frau und beziehen es auf eigene Erfahrungen.',
  ],
  neu: 'Die Schüler deuten die Schlussgeste der Frau als Antwort auf die Lüge.',
};

const p = (name, minuten, aktivitaet, sozialform, neu = false) => ({ name, minuten, aktivitaet, sozialform, neu });

const VORB_AUFWENDIG = {
  material: ['Rollenkarten für 6 Gruppen', 'Foto für den Impuls', 'Platz im Raum für das Standbild'],
  vorher: ['Gruppen vorab einteilen', 'Tische so stellen, dass vorne Platz ist', 'Ablauf des Standbilds einmal selbst durchdenken'],
  stolpersteine: [
    { problem: 'Gruppen werden nicht rechtzeitig fertig.', tipp: 'Nach 10 Minuten eine Zwei-Minuten-Warnung geben.' },
    { problem: 'Das Standbild wird albern.', tipp: 'Klare Regel: Einfrieren auf Kommando, 20 Sekunden ohne Sprechen.' },
    { problem: 'Zuschauende Gruppen sind passiv.', tipp: 'Jeder Zuschauer bekommt eine Beobachtungsfrage.' },
  ],
};

export const FASSUNGEN = {
  standard: {
    name: 'Standardstunde', kurz: 'Bewährt und gut machbar', aufwand: 1,
    phasen: [
      p('Problem/Phänomen begegnen', 5, 'Zitat an der Tafel: „Ich dachte, hier wäre was.“ – Wer sagt das, und stimmt das?', 'Plenum'),
      p('Beobachten & erkunden', 10, 'Arbeitsblatt: Die Küchenszene markieren – Was sagt die Frau, was denkt sie?', 'Einzelarbeit'),
      p('Vermutungen bilden', 5, 'Mit dem Nachbarn: Warum lügt die Frau? Eine Vermutung notieren.', 'Partnerarbeit'),
      p('Vermutungen prüfen', 8, 'Vermutungen an der Tafel sammeln und am Text prüfen: Wo steht ein Beleg?', 'Plenum'),
      p('Regel formulieren', 5, 'Gemeinsam festhalten: In der Kurzgeschichte ist das Verschwiegene wichtiger als das Gesagte.', 'Plenum'),
      p('Anwenden & sichern', 5, 'Ein Satz ins Heft: Warum lügt die Frau? Mit Textbeleg.', 'Einzelarbeit'),
      p('Rückblick Erkenntnisweg', 2, 'Kurz: Wie sind wir heute auf die Deutung gekommen?', 'Plenum'),
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
      p('Problem/Phänomen begegnen', 6, 'Stummer Impuls: Foto eines Brotkorbs um Mitternacht an der Tafel – ohne Worte. Schüler äußern Vermutungen.', 'Plenum', true),
      p('Beobachten & erkunden', 10, 'Arbeitsblatt: Die Küchenszene markieren – Was sagt die Frau, was denkt sie?', 'Einzelarbeit'),
      p('Vermutungen bilden', 4, 'Mit dem Nachbarn: Warum lügt die Frau? Eine Vermutung notieren.', 'Partnerarbeit'),
      p('Vermutungen prüfen', 8, 'Vermutungen an der Tafel sammeln und am Text prüfen.', 'Plenum'),
      p('Regel formulieren', 5, 'Gemeinsam festhalten: Das Verschwiegene ist wichtiger als das Gesagte.', 'Plenum'),
      p('Anwenden & sichern', 5, 'Zurück zum Foto: Was wissen wir jetzt über das Bild?', 'Plenum', true),
      p('Rückblick Erkenntnisweg', 2, 'Kurz: Wie sind wir heute auf die Deutung gekommen?', 'Plenum'),
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
      p('Einstieg', 5, 'Stummer Impuls mit Foto, Vermutungen sammeln.', 'Plenum', true),
      p('Erarbeitung', 15, 'Gruppen erhalten Rollenkarten (Frau / Mann) und schreiben einen inneren Monolog.', 'Gruppenarbeit', true),
      p('Präsentation', 12, 'Zwei Gruppen stellen ein Standbild der Küchenszene, andere sprechen die Gedanken.', 'Plenum', true),
      p('Sicherung', 8, 'Gemeinsam: Was verrät das Standbild über die Kernaussage?', 'Plenum'),
    ],
    vorbereitung: VORB_AUFWENDIG,
  },
};

// Weitere Ideen für „Noch eine Idee“ – werden der Reihe nach vergeben.
export const IDEEN_POOL = [
  {
    name: 'Szenische Lesung', kurz: 'Den Dialog mit verteilten Rollen erleben', aufwand: 2,
    hinweis: 'Neu: Lesung mit verteilten Rollen und Pausen.',
    phasen: [
      p('Einstieg', 5, 'Kurze Wiederholung: Worum ging es in „Das Brot“?', 'Plenum'),
      p('Erarbeitung', 15, 'Paare üben die Küchenszene als szenische Lesung – Pausen und Blicke sind ausdrücklich erlaubt.', 'Partnerarbeit', true),
      p('Präsentation', 10, 'Zwei Paare lesen vor; die Klasse achtet: Wo wird es still, und warum?', 'Plenum', true),
      p('Sicherung', 10, 'Tafelbild „Gesagtes und Gemeintes“ aus den Beobachtungen füllen.', 'Plenum'),
    ],
    vorbereitung: {
      material: ['Textauszug Küchenszene mit Sprecherrollen markiert'],
      vorher: ['Zwei mutige Paare vorab ansprechen'],
      stolpersteine: [{ problem: 'Die Lesung wird heruntergeleiert.', tipp: 'Vorher eine Zeile selbst langsam und mit Pause vorlesen.' }],
    },
  },
  {
    name: 'Produktionsorientiert', kurz: 'Schreiben aus der Sicht einer Figur', aufwand: 3,
    hinweis: 'Neu: Tagebucheintrag der Frau als Schreibauftrag.',
    phasen: [
      p('Einstieg', 5, 'Leitfrage an der Tafel: Was denkt die Frau, als sie die Krümel sieht?', 'Plenum', true),
      p('Erarbeitung', 18, 'Tagebucheintrag der Frau am nächsten Morgen schreiben.', 'Einzelarbeit', true),
      p('Austausch', 10, 'Lesekonferenz in Dreiergruppen: Welcher Eintrag trifft die Frau am besten?', 'Gruppenarbeit', true),
      p('Sicherung', 7, 'Zwei Einträge vorlesen, Bezug zur Kernaussage herstellen.', 'Plenum'),
    ],
    vorbereitung: VORB_AUFWENDIG,
  },
];

export const UMSETZUNG_STUFEN = [
  { key: 'analog', name: 'Rein analog', text: 'Du bekommst einen Stundenverlaufsplan zum Ausdrucken.' },
  { key: 'teil', name: 'Digital unterstützt', text: 'Einzelne Phasen (z. B. Einstieg oder Aufgabe) laufen über die Geräte.' },
  { key: 'digital', name: 'Weitgehend digital', text: 'Tafel und Aufgaben laufen digital, Schüler arbeiten am Tablet.' },
];

/** Kopie einer Vorlage als eigenständiger Entwurf. */
export const alsEntwurf = (vorlage, extra = {}) => ({ ...vorlage, phasen: vorlage.phasen.map((x) => ({ ...x })), ...extra });