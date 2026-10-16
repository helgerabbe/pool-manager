/** Formen der vertieften Übung (2026-10-16): unterschieden nach dem, was das Team am Ende erarbeitet. */
export const VERTIEFTE_VARIANTEN = [
  { key: 'problemloesend', name: 'Problemlösend', kurz: 'Das Team analysiert einen offenen Fall oder ein Rätsel und begründet eine Lösung. Typisch: Mystery, Fallstudie, Schätzfrage, Gedankenexperiment.',
    phasen: ['Fall & Ziel klären', 'Problem erschließen', 'Lösung entwickeln & begründen', 'Lösungen vergleichen', 'Transfer reflektieren'] },
  { key: 'gestaltend', name: 'Gestaltend', kurz: 'Das Team überträgt sein Wissen in ein Produkt (Plakat, Zeitstrahl, Erklärtext). Typisch: arbeitsteilige Gruppenarbeit, WebQuest, danach Galeriegang.',
    phasen: ['Auftrag & Kriterien klären', 'Inhalte planen', 'Produkt erstellen', 'Produkte ausstellen & kommentieren', 'Transfer reflektieren'] },
  { key: 'erkundend', name: 'Erkundend', kurz: 'Das Team plant eine eigene Untersuchung, führt sie durch und deutet den Befund. Typisch: Schülerexperiment, Expertenrunde.',
    phasen: ['Frage & Ziel klären', 'Untersuchung planen', 'Durchführen & dokumentieren', 'Befunde deuten & vergleichen', 'Transfer reflektieren'] },
  { key: 'perspektivisch', name: 'Perspektivisch', kurz: 'Das Team wendet sein Wissen in einer Rolle oder Position an: verhandeln, entscheiden, argumentieren. Typisch: Rollenspiel, Planspiel, Fishbowl.',
    phasen: ['Situation & Rollen klären', 'Position erarbeiten', 'Spielen / verhandeln', 'Auswerten mit Kriterien', 'Transfer reflektieren'] },
];

const PROMPTS = {
  problemloesend: 'Problemlösend: Teams analysieren einen offenen Fall/ein Rätsel mit ihrem Vorwissen und begründen eine Lösung; Lösungen werden verglichen. Methoden z. B. Mystery, Fallstudie.',
  gestaltend: 'Gestaltend: Teams übertragen ihr Wissen in ein Produkt nach Kriterien; Produkte werden ausgestellt und kommentiert (z. B. Galeriegang).',
  erkundend: 'Erkundend: Teams planen und führen eine eigene Untersuchung/ein Experiment durch und deuten den Befund mit ihrem Wissen; Befunde werden verglichen.',
  perspektivisch: 'Perspektivisch: Teams wenden ihr Wissen in Rollen/Positionen an (Rollenspiel, Planspiel, Fishbowl); Beobachter werten mit Kriterien aus.',
};
VERTIEFTE_VARIANTEN.forEach((v) => { v.prompt = PROMPTS[v.key]; });

export const vertiefteVariante = (key) => VERTIEFTE_VARIANTEN.find((v) => v.key === key);