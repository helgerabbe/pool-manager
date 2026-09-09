/**
 * pruefungKategorien.js
 *
 * Single Source of Truth für die Export-Vorprüfung (Prüfbereich Tab 8):
 * die fünf MBK-Fehlerkategorien, Schweregrade und Entscheidungs-Stände.
 * Nummern und Bezeichnungen entsprechen dem MBK-Papier vom 2026-09-02 —
 * der Bau nutzt dieselben fünf Nummern in seiner Rückmeldung.
 */

export const PRUEF_KATEGORIEN = Object.freeze({
  1: { label: 'Noch leer oder Platzhalter', kurz: 'Leer' },
  2: { label: 'Aufgabenstellung unklar', kurz: 'Aufgabe' },
  3: { label: 'Musterlösung fehlt oder reicht nicht', kurz: 'Lösung' },
  4: { label: 'Schüler erfahren nicht, ob es richtig war', kurz: 'Rückmeldung' },
  5: { label: 'Text oder Material zu schwer für die Schüler', kurz: 'Material' },
  // Kategorie 6 ist eine Ergänzung des Pool-Managers (2026-09-03): Sie meldet
  // keinen inhaltlichen Mangel, sondern eine kaputte Struktur — Lernpakete oder
  // Aufgaben, die keinem (noch existierenden) Themenfeld mehr zugeordnet sind.
  // Solche Reste reisen unbemerkt im Export mit, und der Bau kann sie nirgends
  // einhängen.
  6: { label: 'Keinem Themenfeld zugeordnet', kurz: 'Zuordnung' },
  // Kategorie 7 entsteht nur beim Abholen der MBK-Rückmeldung (2026-09-04):
  // Der Bau hat etwas gemeldet, das sich keiner der sechs Kategorien zuordnen
  // lässt. Bewusst NICHT von einer KI geraten — eine falsche Kategorie führt
  // die Lehrkraft in die Irre, eine offene nicht.
  7: { label: 'Hinweis vom Moodle-Team', kurz: 'Moodle-Team' },
});

export const PRUEF_KATEGORIE_NUMMERN = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

export const PRUEF_SCHWERE = Object.freeze({
  blockiert: { label: 'Geht so nicht', cls: 'bg-red-100 text-red-800 border-red-300', rang: 0 },
  stoert: { label: 'Stört', cls: 'bg-amber-100 text-amber-800 border-amber-300', rang: 1 },
  hinweis: { label: 'Tipp', cls: 'bg-slate-100 text-slate-700 border-slate-300', rang: 2 },
});

export const PRUEF_ENTSCHEIDUNG = Object.freeze({
  offen: { label: 'Offen' },
  behoben: { label: 'Erledigt' },
  bewusst: { label: 'Bleibt so' },
});

/**
 * Wie der gebaute Kurs an einer Stelle vom Pool-Manager abweicht (Feld
 * `kurs_umgehung` der MBK-Rückmeldung, sieben Werte, seit 2026-09-09).
 * Der Satz in `erklaerung` ist das, was die Fachgruppe liest — sie soll nicht
 * raten müssen, warum der Kurs anders aussieht als ihre Fassung.
 */
export const KURS_UMGEHUNG = Object.freeze({
  keine: null,
  entfernt: {
    label: 'Im Kurs entfernt',
    erklaerung: 'Diese Stelle ist im gebauten Kurs nicht enthalten, bis der Punkt geklärt ist.',
    cls: 'bg-red-50 text-red-800 border-red-200',
  },
  baustelle: {
    label: 'Im Kurs Platzhalter',
    erklaerung: 'Der Kurs zeigt hier vorläufig einen Platzhalter statt des Inhalts.',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ausgeblendet: {
    label: 'Im Kurs ausgeblendet',
    erklaerung: 'Die Stelle ist im Kurs vorhanden, für die Schüler aber verborgen.',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  korrektur: {
    label: 'Kurs weicht ab (Korrektur)',
    erklaerung: 'Das Moodle-Team überschreibt diese Stelle im Kurs vorläufig selbst. Übernimmst du den Vorschlag hier, fällt die Krücke weg.',
    cls: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  'korrektur ausgesetzt': {
    label: 'Korrektur ruht',
    erklaerung: 'Du hast dieses Feld geändert — deine Fassung gewinnt, die Krücke des Moodle-Teams ruht und wird dort noch geprüft.',
    cls: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  gestaltung: {
    label: 'Kurs weicht ab (Gestaltung)',
    erklaerung: 'Diese Aktivität hat im Kurs eine eigene Darstellung. Der Inhalt kommt weiter aus dem Pool-Manager.',
    cls: 'bg-teal-50 text-teal-800 border-teal-200',
  },
});

/** Wer den Punkt gefunden hat. */
export const MBK_QUELLE = Object.freeze({
  bau: { label: 'Beim Bauen aufgefallen' },
  sichtung: { label: 'Didaktischer Blick' },
});

export function getUmgehung(wert) {
  return KURS_UMGEHUNG[wert] || null;
}

export function getKategorieLabel(nr) {
  return PRUEF_KATEGORIEN[nr]?.label || `Kategorie ${nr}`;
}