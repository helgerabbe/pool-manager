/**
 * Themenfeld-Plätze (2026-11-11): Jedes Themenfeld hat zwei feste Plätze für
 * Aufgaben außerhalb der Lernpakete — „Einstieg" am Anfang und
 * „Gesamtaufgabe" am Ende. Sie haben keinen Wissensspeicher, keine eigenen
 * Lernziele und keinen Abschluss. Ein Platz ohne Aufgabe existiert für
 * Schüler und Export nicht.
 */
export const THEMENFELD_PLAETZE = [
  {
    key: 'einstieg',
    titel: 'Einstieg',
    beschreibung: 'Steht am Anfang des Themenfelds: ein erster Einblick, bevor die Lernpakete beginnen.',
    leer: 'Noch keine Einstiegsaufgabe in diesem Themenfeld.',
  },
  {
    key: 'gesamtaufgabe',
    titel: 'Gesamtaufgabe',
    beschreibung: 'Steht am Ende des Themenfelds: eine Aufgabe, die alle Lernpakete zusammenführt.',
    leer: 'Noch keine Gesamtaufgabe in diesem Themenfeld.',
  },
];