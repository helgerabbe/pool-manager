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

export function getKategorieLabel(nr) {
  return PRUEF_KATEGORIEN[nr]?.label || `Kategorie ${nr}`;
}