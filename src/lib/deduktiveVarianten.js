/** Varianten der deduktiven Erarbeitung (2026-10-16), vorerst für die Didaktische Konzeption. */
export const DEDUKTIVE_VARIANTEN = [
  { key: 'darbietend', name: 'Klassisch darbietend', kurz: 'Du führst die Regel ein und erklärst sie an Musterbeispielen, dann wenden die Schüler sie angeleitet und selbstständig an.',
    phasen: ['Regel einführen', 'An Musterbeispielen erklären', 'Verständnis sichern', 'Angeleitet anwenden', 'Selbstständig anwenden'] },
  { key: 'loesungsbeispiel', name: 'Lösungsbeispiel-gestützt', kurz: 'Die Regel kommt mit durchgerechneten Beispielen, die Hilfen werden schrittweise weniger.',
    phasen: ['Regel und Lösungsbeispiel', 'Beispiel nachvollziehen & erklären', 'Teilweise gelöste Aufgaben', 'Eigene Aufgaben'] },
  { key: 'material', name: 'Material-gestützt', kurz: 'Die Schüler erschließen die Regel selbst aus Merkkasten, Text oder Erklärvideo.',
    phasen: ['Regel im Material erschließen', 'Verständnis im Paar abgleichen', 'Kurze Klärung im Plenum', 'Anwenden'] },
  { key: 'kompakt', name: 'Kompakt-deduktiv', kurz: 'Knappe Einführung der Regel, ein Beispiel, dann viel Übungszeit.',
    phasen: ['Regel knapp einführen', 'Ein Beispiel', 'Anwenden & üben'] },
];