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
};