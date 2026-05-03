/**
 * lernpfadLockUtils.js
 *
 * Lese-Helfer rund um die Junction-Table `LernpfadAufgabeMembership`.
 *
 * SCHRITT 2 (3-stufiger Freigabe-Workflow): Die Inhalts-Sperre einer Aufgabe
 * ist NICHT mehr an `pfad_status === 'locked_for_export'` gekoppelt. Ein
 * geprüftes Dashboard sperrt nur noch die Komposition (im Architekt selbst),
 * NICHT die enthaltenen Inhalte. Das ist nötig, weil bis zur finalen
 * Einheits-Freigabe (Schritt 3) noch die anderen drei Lerntyp-Dashboards
 * komponiert werden müssen, was jederzeit Inhaltsänderungen erfordern kann.
 *
 * Folge: `isAufgabeLocked` und `getLockStatusBatchByEinheit` liefern aktuell
 * KEINE Sperre mehr (leeres Ergebnis). Sie bleiben als API erhalten, damit
 * Schritt 3 sie nahtlos auf die neue Einheits-Sperre umstellen kann, ohne
 * dass alle Aufrufer angefasst werden müssen.
 */

import { PFAD_STATUS } from '@/lib/pfadStatus';

// Bewusst exportiert, damit Schritt 3 sie für die Einheits-Sperre wiederverwenden
// kann, ohne dass die Konstante neu definiert wird.
export const LOCK_STATUS = PFAD_STATUS.LOCKED;

/**
 * Lock-Status für eine einzelne Aufgabe.
 *
 * Phase 1 (Schritt 2): liefert immer `{ locked: false, by_pfade: [] }`,
 * weil die Inhalts-Sperre vom Dashboard-Lock entkoppelt wurde.
 *
 * @param {string} _aufgabeId
 * @returns {Promise<{ locked: boolean, by_pfade: string[] }>}
 */
export async function isAufgabeLocked(_aufgabeId) {
  return { locked: false, by_pfade: [] };
}

/**
 * Batched Lock-Status für mehrere Aufgaben.
 *
 * Phase 1 (Schritt 2): liefert eine leere Map. Aufrufer dürfen sich darauf
 * verlassen, dass „nicht in der Map" weiterhin „ungelockt" bedeutet.
 *
 * @param {string} _einheitId
 * @returns {Promise<Map<string, { locked: boolean, by_pfade: string[] }>>}
 */
export async function getLockStatusBatchByEinheit(_einheitId) {
  return new Map();
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