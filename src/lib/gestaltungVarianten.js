/** Formen der Gestaltungsstunde (2026-10-17): Jeder Schüler erstellt ein eigenes Produkt. Unterschieden nach der Art des Produkts. */
export const GESTALTUNG_VARIANTEN = [
  { key: 'schreibend', name: 'Schreibend', kurz: 'Ein eigener Text entsteht (Geschichte, Brief, Bericht, Gedicht). Typisch: Schreibplan, Schreibkonferenz, Textlupe, Überarbeitung nach Kriterien.',
    phasen: ['Schreibanlass & Kriterien', 'Ideen sammeln & planen', 'Schreiben', 'Rückmeldung einholen', 'Überarbeiten & vorstellen'] },
  { key: 'bildnerisch', name: 'Bildnerisch', kurz: 'Ein Bild, Plakat, Modell oder Objekt wird gestaltet. Typisch: Skizzen, Materialerprobung, Zwischenbesprechung, Ausstellung.',
    phasen: ['Gestaltungsauftrag & Kriterien', 'Ideen skizzieren', 'Gestalten', 'Zwischenbesprechung', 'Fertigstellen & ausstellen'] },
  { key: 'darstellend', name: 'Darstellend', kurz: 'Etwas wird eingeübt und aufgeführt (Szene, Musikstück, Vortrag, Bewegungsfolge). Typisch: Proben, Feedback-Runden, Präsentation.',
    phasen: ['Auftrag & Kriterien', 'Erarbeiten & ausprobieren', 'Proben', 'Feedback & verbessern', 'Aufführen & reflektieren'] },
  { key: 'medial', name: 'Medial', kurz: 'Ein mediales Produkt entsteht (Erklärvideo, Podcast, Präsentation, Website). Typisch: Storyboard, Aufnahme, Schnitt, Vorführung.',
    phasen: ['Auftrag & Kriterien', 'Konzept / Storyboard', 'Produzieren', 'Prüfen & überarbeiten', 'Präsentieren'] },
];

export const gestaltungVariante = (key) => GESTALTUNG_VARIANTEN.find((v) => v.key === key);