// Anspruchsprofil einer Aktivität (Entwurf 2026-10-06): Warum Methoden im Unterricht scheitern können.
// Skalen 1 = gering … 5 = sehr hoch.
export const PROFIL_SKALEN = [
  { key: 'komplexitaet', label: 'Methodische Komplexität', frage: 'Wie viel methodisches Können brauchen die Schüler?' },
  { key: 'einuebung', label: 'Einübungsbedarf', frage: 'Wie oft muss die Klasse sie gemacht haben, bis sie gut läuft?' },
  { key: 'lerngruppe', label: 'Anspruch an die Lerngruppe', frage: 'Braucht es eine gefestigte Gruppe und eine gute Beziehung?' },
  { key: 'lehrkraft', label: 'Erfahrung der Lehrkraft', frage: 'Wie sicher muss die Lehrkraft mit der Methode sein?' },
  { key: 'vorbereitung', label: 'Vorbereitungsaufwand', frage: 'Wie viel Zeit kostet die Vorbereitung?' },
  { key: 'material', label: 'Materialabhängigkeit', frage: 'Steht und fällt sie mit gut gemachtem Material?' },
  { key: 'steuerung', label: 'Steuerungsrisiko', frage: 'Wie leicht kann die Lehrkraft die Kontrolle verlieren?' },
];

export const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

// Eignung je Jahrgang: ja = geeignet · vereinfachen = geht, braucht mehr Zeit/Anleitung · warnung = grenzwertig · nein = nicht geeignet
export const EIGNUNG = {
  ja: { label: 'Geeignet', cls: 'bg-green-500' },
  vereinfachen: { label: 'Mit Vereinfachung / mehr Zeit', cls: 'bg-yellow-400' },
  warnung: { label: 'Grenzwertig, deutliche Warnung', cls: 'bg-orange-500' },
  nein: { label: 'Nicht geeignet', cls: 'bg-red-500' },
};

export const PROFIL_PROBE = {
  'Informierender Unterrichtseinstieg': {
    werte: { komplexitaet: 1, einuebung: 1, lerngruppe: 1, lehrkraft: 1, vorbereitung: 2, material: 2, steuerung: 1 },
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Funktioniert immer und sofort, auch ohne Vorerfahrung. In Klasse 5 und 6 kurz halten und den Ablauf zusätzlich sichtbar machen.',
  },
  'Stummer Impuls': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 4, steuerung: 2 },
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Leicht einzusetzen, wird mit Routine besser. Steht und fällt mit einem wirklich treffenden Impuls. Jüngere Klassen brauchen danach eine klare Beobachtungsfrage.',
  },
  'Provokante These': {
    werte: { komplexitaet: 3, einuebung: 2, lerngruppe: 4, lehrkraft: 3, vorbereitung: 2, material: 3, steuerung: 4 },
    jahrgaenge: { 5: 'warnung', 6: 'warnung', 7: 'vereinfachen', 8: 'vereinfachen', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Braucht eine Gruppe, die fair streiten kann, und eine Lehrkraft, die die Diskussion sicher lenkt. In Klasse 5 und 6 nur mit sehr greifbarer These und festen Gesprächsregeln.',
  },
  'Blitzlicht': {
    werte: { komplexitaet: 1, einuebung: 2, lerngruppe: 3, lehrkraft: 1, vorbereitung: 1, material: 1, steuerung: 2 },
    jahrgaenge: { 5: 'ja', 6: 'ja', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Fast ohne Vorbereitung und überall einsetzbar. Ehrliche Antworten gibt es erst in einer Gruppe mit Vertrauen, sonst bleibt es bei „gut“. Als Ritual wirkt es am besten.',
  },
  'Brainstorming / Mindmap': {
    werte: { komplexitaet: 3, einuebung: 3, lerngruppe: 2, lehrkraft: 2, vorbereitung: 2, material: 2, steuerung: 3 },
    jahrgaenge: { 5: 'vereinfachen', 6: 'vereinfachen', 7: 'ja', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Muss ein paar Mal geübt werden, bis die Schüler sammeln und ordnen trennen und den Sinn verstehen. In Klasse 5 und 6 mit vorgegebenen Hauptästen beginnen.',
  },
  'Vertieftes Üben im Team': {
    werte: { komplexitaet: 4, einuebung: 4, lerngruppe: 4, lehrkraft: 3, vorbereitung: 4, material: 4, steuerung: 4 },
    jahrgaenge: { 5: 'warnung', 6: 'vereinfachen', 7: 'vereinfachen', 8: 'ja', 9: 'ja', 10: 'ja', 11: 'ja', 12: 'ja', 13: 'ja' },
    fazit: 'Anspruchsvoll für alle Beteiligten: gutes Material, eingespielte Teams und eine Lehrkraft, die den Prozess im Blick behält. Erst mit kleinen Teamaufgaben anbahnen.',
  },
};