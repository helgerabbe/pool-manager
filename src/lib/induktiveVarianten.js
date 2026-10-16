/** Varianten der induktiven Erarbeitung (2026-10-16). Das Modell „induktiv“ ist ein Gerüst, keine Pflichtfolge. */
export const INDUKTIVE_VARIANTEN = [
  { key: 'offen', name: 'Offen-entdeckend', kurz: 'Die Schüler vergleichen Beispiele und finden die Regel weitgehend selbst.',
    prompt: 'Offen-entdeckend: wenig Lenkung, viel Zeit zum Beobachten, Vermuten und Prüfen; die Lehrkraft moderiert nur. Alle Modellphasen ausführlich.' },
  { key: 'gelenkt', name: 'Gelenkt-entdeckend', kurz: 'Du steuerst mit Leitfragen und Kriterien, die Schüler ziehen den Schluss.',
    prompt: 'Gelenkt-entdeckend: Die Lehrkraft lenkt Beobachtung und Vergleich mit Leitfragen oder Kriterien; die Schüler formulieren die Regel. Vermutungen bilden/prüfen dürfen zusammengefasst werden.' },
  { key: 'gestuft', name: 'Schrittweise gestützt', kurz: 'Du gibst Informationen portionsweise, die Schüler untersuchen ihr Material jeweils neu.',
    prompt: 'Schrittweise gestützt: Die Schüler erzeugen oder erhalten Material; die Lehrkraft gibt in 2–3 Runden jeweils einen kleinen Informationsimpuls (z. B. eine Unterscheidung oder Definition), danach untersuchen/sortieren die Schüler ihr Material erneut. Mache diese Impuls-Runden in den Phasen sichtbar.' },
  { key: 'kompakt', name: 'Kompakt-induktiv', kurz: 'Wenige klare Beispiele, ein gezielter Vergleich, gemeinsame Einsicht, kurze Anwendung.',
    prompt: 'Kompakt-induktiv: wenige gut gewählte Beispiele, ein gezielter Vergleich, gemeinsame Formulierung, kurze Anwendung. Phasen zusammenfassen (ca. 3–4 Phasen), die Erkenntnisarbeit der Schüler aber nicht streichen.' },
];

export const variante = (key) => INDUKTIVE_VARIANTEN.find((v) => v.key === key);