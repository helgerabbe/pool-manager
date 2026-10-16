/** Formen der Wiederholung (2026-10-16): unterschieden nach dem Zweck, nicht nur nach der Dauer. */
export const WIEDERHOLUNG_VARIANTEN = [
  { key: 'kurz', name: 'Kurz (Reaktivieren)', kurz: 'Vorwissen wird wieder aktiviert, damit Neues daran anschließen kann. 5–15 Min., meist zu Stundenbeginn. Die Lehrkraft gibt den Inhalt vor, alle wiederholen dasselbe. Typisch: Blitzlicht, Think-Pair-Share, digitaler Kurztest.',
    phasen: ['Impuls', 'Erinnern', 'Zusammentragen & korrigieren', 'Brücke zum Neuen'] },
  { key: 'umfassend', name: 'Umfassend (Konsolidieren & Vernetzen)', kurz: 'Mehrere Inhalte einer Einheit werden geordnet, verknüpft und Lücken geschlossen, z. B. vor einer Klassenarbeit. Die Schüler finden ihre eigenen Lücken und wiederholen gezielt. Typisch: Stationenlernen, Mindmap, Kurztest mit Selbstkorrektur.',
    phasen: ['Überblick', 'Selbsteinschätzung', 'Gezielt wiederholen', 'Vernetzen', 'Kontrolle mit Selbstkorrektur'] },
];

const PROMPTS = {
  kurz: 'Kurz (Reaktivieren): 5–15 Min. Vorwissen aktivieren als Brücke zum neuen Inhalt; lehrkraftgesteuert, alle wiederholen dasselbe; Phasen Impuls → Erinnern → Zusammentragen & korrigieren → Brücke zum Neuen.',
  umfassend: 'Umfassend (Konsolidieren & Vernetzen): ganze Stunde, mehrere Inhalte der Einheit; Selbsteinschätzung als Wegweiser (keine Bewertung), gezielte differenzierte Wiederholung nach Lücken, Vernetzen (Mindmap/Strukturbild), Kontrolle mit Selbstkorrektur.',
};
WIEDERHOLUNG_VARIANTEN.forEach((v) => { v.prompt = PROMPTS[v.key]; });

export const wiederholungVariante = (key) => WIEDERHOLUNG_VARIANTEN.find((v) => v.key === key);