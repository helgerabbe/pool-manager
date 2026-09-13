/**
 * lib/importSchritte.js
 *
 * Übersetzt die Formular-Eingaben eines Sequenz-Schritts in die Form, die der
 * Auftrags-Vertrag erwartet: JSON-Textfelder werden zu Objekten, Komma-Listen
 * zu Arrays, leere Felder verschwinden.
 *
 * Bewusst getrennt vom Formular: Genau dieselbe Umwandlung gilt für einen
 * einzelnen Schritt (schritt_einfuegen) und für eine ganze Schrittfolge — sie
 * darf nicht zweimal etwas leicht anderes tun.
 */

const ARRAY_FELDER = ['formate'];
const JSON_FELDER = ['field_values'];

function wandleFeld(name, wert) {
  if (JSON_FELDER.includes(name) && typeof wert === 'string') {
    return JSON.parse(wert); // Fehler wandert bewusst nach oben (Formular meldet ihn)
  }
  if (ARRAY_FELDER.includes(name) && typeof wert === 'string') {
    return wert
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return wert;
}

function leer(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

/** Ein Schritt aus dem Formular → Schritt nach Vertrag. */
export function normalisiereSchritt(schritt = {}, typen = []) {
  const def = typen.find((t) => t.typ === schritt.typ);
  const ergebnis = { typ: schritt.typ };
  if (schritt.id) ergebnis.id = schritt.id;
  if (!leer(schritt.titel)) ergebnis.titel = schritt.titel;

  const quelle = def?.block ? schritt[def.block] || {} : schritt;
  const ziel = {};
  for (const feld of def?.felder || []) {
    const wert = quelle[feld.name];
    if (leer(wert)) continue;
    ziel[feld.name] = wandleFeld(feld.name, wert);
  }

  if (def?.block) ergebnis[def.block] = ziel;
  else Object.assign(ergebnis, ziel);

  return ergebnis;
}

/** Eine ganze Schrittfolge → Schritte nach Vertrag, mit Reihenfolge. */
export function normalisiereSchrittfolge(schritte = [], typen = []) {
  return (Array.isArray(schritte) ? schritte : []).map((s, idx) => ({
    ...normalisiereSchritt(s, typen),
    reihenfolge: idx,
  }));
}