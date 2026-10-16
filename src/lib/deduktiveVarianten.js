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

const PROMPTS = {
  darbietend: 'Klassisch darbietend: Die Lehrkraft führt die Regel ein und erklärt sie an 1–2 Musterbeispielen, dann angeleitete und selbstständige Anwendung.',
  loesungsbeispiel: 'Lösungsbeispiel-gestützt: Regel mit vollständig gelösten Beispielen; Schüler erklären die Beispiele, dann teilweise gelöste Aufgaben mit abnehmender Hilfe (Fading), dann eigene Aufgaben.',
  material: 'Material-gestützt: Die Schüler erschließen die Regel selbst aus Merkkasten, Text oder Erklärvideo, gleichen im Paar ab, kurze Klärung im Plenum, dann Anwendung.',
  kompakt: 'Kompakt-deduktiv: Regel knapp einführen, ein Beispiel, dann eine lange Übungsphase. Ca. 3 Phasen.',
};
DEDUKTIVE_VARIANTEN.forEach((v) => { v.prompt = PROMPTS[v.key]; });

export const deduktivVariante = (key) => DEDUKTIVE_VARIANTEN.find((v) => v.key === key);