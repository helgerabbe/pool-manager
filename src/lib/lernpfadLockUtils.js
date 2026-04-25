/**
 * lernpfadLockUtils.js
 *
 * Lese-Helfer rund um die Junction-Table `LernpfadAufgabeMembership`.
 *
 * Zweck:
 *   - In Tab 5 (Aufgaben-Editor) beantworten: „Ist diese Aufgabe gerade durch
 *     einen freigegebenen Lernpfad gesperrt? Wenn ja, durch welche?"
 *   - In Tab 7 (Cockpit) batched bestimmen: Welche Aufgaben sind aktuell
 *     für den Export gelockt?
 *
 * Sperrkriterium ist EXPLIZIT `pfad_status === 'locked_for_export'` —
 * `'draft'` führt nicht zur Sperre, sondern markiert nur die Zugehörigkeit.
 */

import { base44 } from '@/api/base44Client';

const LOCK_STATUS = 'locked_for_export';

/**
 * Lock-Status für eine einzelne Aufgabe.
 *
 * @param {string} aufgabeId
 * @returns {Promise<{ locked: boolean, by_pfade: string[] }>}
 *   - locked   : true, wenn ≥ 1 Membership-Eintrag mit pfad_status='locked_for_export' existiert.
 *   - by_pfade : Liste der Lerntyp-Keys (z.B. ['minimalist', 'ehrgeizig']) – dedupliziert.
 */
export async function isAufgabeLocked(aufgabeId) {
  if (!aufgabeId) return { locked: false, by_pfade: [] };

  const memberships = await base44.entities.LernpfadAufgabeMembership.filter({
    aufgabe_id: aufgabeId,
    pfad_status: LOCK_STATUS,
  });

  const lerntypen = Array.from(
    new Set((memberships || []).map((m) => m.lerntyp).filter(Boolean))
  );

  return { locked: lerntypen.length > 0, by_pfade: lerntypen };
}

/**
 * Batched Lock-Status für mehrere Aufgaben.
 * Lädt alle Memberships einer Einheit auf einen Schlag und gruppiert sie clientseitig.
 *
 * @param {string} einheitId
 * @returns {Promise<Map<string, { locked: boolean, by_pfade: string[] }>>}
 *   Key = aufgabe_id, Wert = wie isAufgabeLocked.
 *   Aufgaben ohne Eintrag sind NICHT in der Map enthalten (= ungelockt).
 */
export async function getLockStatusBatchByEinheit(einheitId) {
  const result = new Map();
  if (!einheitId) return result;

  const memberships = await base44.entities.LernpfadAufgabeMembership.filter({
    einheit_id: einheitId,
    pfad_status: LOCK_STATUS,
  });

  for (const m of memberships || []) {
    if (!m.aufgabe_id || !m.lerntyp) continue;
    const entry = result.get(m.aufgabe_id) || { locked: true, by_pfade: [] };
    if (!entry.by_pfade.includes(m.lerntyp)) entry.by_pfade.push(m.lerntyp);
    result.set(m.aufgabe_id, entry);
  }
  return result;
}

// Lerntyp-Keys → menschlich lesbare Labels (für die Editor-Warnmeldung).
export const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

export function formatLerntypList(lerntypKeys = []) {
  return lerntypKeys.map((k) => LERNTYP_LABELS[k] || k).join(', ');
}