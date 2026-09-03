/**
 * pruefungKategorien.js
 *
 * Single Source of Truth für die Export-Vorprüfung (Prüfbereich Tab 8):
 * die fünf MBK-Fehlerkategorien, Schweregrade und Entscheidungs-Stände.
 * Nummern und Bezeichnungen entsprechen dem MBK-Papier vom 2026-09-02 —
 * der Bau nutzt dieselben fünf Nummern in seiner Rückmeldung.
 */

export const PRUEF_KATEGORIEN = Object.freeze({
  1: { label: 'Leer oder Platzhalter', kurz: 'Leer' },
  2: { label: 'Arbeitsauftrag unklar oder nicht bearbeitbar', kurz: 'Auftrag' },
  3: { label: 'Erwartungshorizont fehlt oder trägt nicht', kurz: 'Horizont' },
  4: { label: 'Rückmeldeweg nicht entschieden', kurz: 'Rückmeldung' },
  5: { label: 'Material und Text nicht schülertauglich', kurz: 'Material' },
});

export const PRUEF_KATEGORIE_NUMMERN = Object.freeze([1, 2, 3, 4, 5]);

export const PRUEF_SCHWERE = Object.freeze({
  blockiert: { label: 'Blockiert', cls: 'bg-red-100 text-red-800 border-red-300', rang: 0 },
  stoert: { label: 'Stört', cls: 'bg-amber-100 text-amber-800 border-amber-300', rang: 1 },
  hinweis: { label: 'Hinweis', cls: 'bg-slate-100 text-slate-700 border-slate-300', rang: 2 },
});

export const PRUEF_ENTSCHEIDUNG = Object.freeze({
  offen: { label: 'Offen' },
  behoben: { label: 'Behoben' },
  bewusst: { label: 'Bewusst gelassen' },
});

export function getKategorieLabel(nr) {
  return PRUEF_KATEGORIEN[nr]?.label || `Kategorie ${nr}`;
}