/** Formen der Erschließungsstunde (2026-10-17): unterschieden nach dem Gegenstand, der gedeutet wird. */
export const ERSCHLIESSUNG_VARIANTEN = [
  { key: 'textdeutend', name: 'Textdeutend', kurz: 'Ein literarischer Text (Gedicht, Kurzgeschichte, Szene) wird erschlossen und gedeutet. Typisch: Leseeindrücke sammeln, Textmarkierung, Deutungshypothesen am Text prüfen.',
    phasen: ['Erstbegegnung mit dem Text', 'Erste Eindrücke & Fragen', 'Deutungshypothesen bilden', 'Genaue Arbeit am Text', 'Deutung sichern & reflektieren'] },
  { key: 'quellenkritisch', name: 'Quellenkritisch', kurz: 'Eine Quelle oder ein Sachtext wird eingeordnet, erfasst und auf Absicht und Perspektive befragt. Typisch: W-Fragen, Quellenanalyse, Perspektivwechsel.',
    phasen: ['Quelle einordnen', 'Inhalt erfassen', 'Absicht & Perspektive untersuchen', 'Aussagewert beurteilen', 'Ergebnis sichern'] },
  { key: 'werkerschliessend', name: 'Werkerschließend', kurz: 'Ein Bild, eine Karikatur, ein Musikstück oder Film wird wahrgenommen, analysiert und gedeutet. Typisch: Bildbeschreibung, Detailausschnitte, Wirkung untersuchen.',
    phasen: ['Wahrnehmen & beschreiben', 'Gestaltung analysieren', 'Wirkung & Bedeutung deuten', 'In den Kontext einordnen', 'Deutung sichern & reflektieren'] },
  { key: 'vergleichend', name: 'Vergleichend', kurz: 'Zwei oder mehr Texte, Quellen oder Werke werden erschlossen und nach Kriterien verglichen. Typisch: arbeitsteilige Erschließung, Vergleichstabelle, Gruppenpuzzle.',
    phasen: ['Gegenstände kennenlernen', 'Einzeln erschließen', 'Vergleichskriterien festlegen', 'Vergleichen', 'Ergebnis deuten & sichern'] },
];

export const erschliessungVariante = (key) => ERSCHLIESSUNG_VARIANTEN.find((v) => v.key === key);