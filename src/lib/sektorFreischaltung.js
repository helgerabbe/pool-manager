/**
 * sektorFreischaltung.js
 *
 * Reine, side-effect-freie Logik für die Sektor-Freischaltung (Gating auf
 * Sektor-Ebene). Bewusst minimal gehalten (siehe Konzept-Entscheidung):
 *
 *   freischalt_bedingung: {
 *     modus: 'sofort' | 'nach_sektor',   // Default 'sofort'
 *     voraussetzung_sektor_id: string|null   // nur bei 'nach_sektor'
 *   }
 *
 * KEINE UND/ODER-Logik — genau EIN vorgeschalteter Sektor. Kaskaden ergeben
 * sich implizit (Sektor 3 kann erst erledigt werden, wenn Sektor 2 erledigt
 * und damit freigeschaltet wurde).
 */

export const FREISCHALT_MODUS = Object.freeze({
  SOFORT: 'sofort',
  NACH_SEKTOR: 'nach_sektor',
});

/**
 * Normalisiert eine (evtl. fehlende/legacy) Freischalt-Bedingung auf das
 * kanonische Objekt. Legacy/null → 'sofort'. Bei 'nach_sektor' ohne gültige
 * Sektor-ID fällt das Verhalten defensiv auf 'sofort' zurück.
 */
export function normalizeFreischaltBedingung(fb) {
  if (!fb || typeof fb !== 'object') {
    return { modus: FREISCHALT_MODUS.SOFORT, voraussetzung_sektor_id: null };
  }
  if (fb.modus === FREISCHALT_MODUS.NACH_SEKTOR && typeof fb.voraussetzung_sektor_id === 'string' && fb.voraussetzung_sektor_id) {
    return { modus: FREISCHALT_MODUS.NACH_SEKTOR, voraussetzung_sektor_id: fb.voraussetzung_sektor_id };
  }
  return { modus: FREISCHALT_MODUS.SOFORT, voraussetzung_sektor_id: null };
}

/**
 * Zyklenschutz für das Editor-Dropdown: liefert die Menge an Sektor-IDs, die
 * NICHT als Voraussetzung für `sektorId` gewählt werden dürfen, weil sonst ein
 * Kreis entstünde (A wartet auf B, B wartet (transitiv) auf A).
 *
 * Wir folgen der Voraussetzungs-Kette ab `sektorId` aufwärts und sammeln alle
 * Sektoren, die (direkt oder transitiv) bereits auf `sektorId` zurückzeigen.
 * Plus den Sektor selbst.
 *
 * @param {Array} sektoren  - Liste aller Sektoren des Lerntyps (mit sektor_id + freischalt_bedingung)
 * @param {string} sektorId - Sektor, für den die Auswahl gefiltert wird
 * @returns {Set<string>} verbotene Voraussetzungs-IDs
 */
export function getVerboteneVoraussetzungen(sektoren, sektorId) {
  const verboten = new Set([sektorId]);
  const byId = new Map((sektoren || []).map((s) => [s.sektor_id, s]));

  // Alle Sektoren finden, deren Voraussetzungs-Kette auf sektorId führt.
  for (const s of sektoren || []) {
    if (s.sektor_id === sektorId) continue;
    let current = s;
    const visited = new Set();
    while (current) {
      const fb = normalizeFreischaltBedingung(current.freischalt_bedingung);
      if (fb.modus !== FREISCHALT_MODUS.NACH_SEKTOR || !fb.voraussetzung_sektor_id) break;
      if (visited.has(current.sektor_id)) break; // Schutz vor bereits existierenden Kreisen
      visited.add(current.sektor_id);
      if (fb.voraussetzung_sektor_id === sektorId) {
        verboten.add(s.sektor_id);
        break;
      }
      current = byId.get(fb.voraussetzung_sektor_id);
    }
  }
  return verboten;
}