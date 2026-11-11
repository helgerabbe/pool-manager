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
    beschreibung: 'Freiwillig: Hier kannst du eine Aufgabe an den Anfang des Themenfelds stellen, die den Schülern einen ersten Einblick gibt, bevor die Lernpakete beginnen. Ein Themenfeld braucht keinen Einstieg; ohne Aufgabe starten die Schüler direkt mit dem ersten Lernpaket.',
    leer: 'Noch keine Einstiegsaufgabe in diesem Themenfeld.',
  },
  {
    key: 'gesamtaufgabe',
    titel: 'Gesamtaufgabe',
    beschreibung: 'Steht am Ende des Themenfelds: eine Aufgabe, die alle Lernpakete zusammenführt.',
    leer: 'Noch keine Gesamtaufgabe in diesem Themenfeld.',
  },
];