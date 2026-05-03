/**
 * lernpfadLockUtils.js
 *
 * Lese-Helfer für die Inhalts-Sperre einer Aufgabe.
 *
 * Schritt 3 des dreistufigen Freigabe-Workflows:
 * Die Inhalts-Sperre einer Aufgabe ist NICHT mehr an den Pfad-Status
 * (`LernpfadAufgabeMembership.pfad_status`) gekoppelt, sondern an den finalen
 * Einheits-Status (`Einheiten.einheit_freigabe_status === 'final_freigegeben'`).
 *
 * Konsequenzen:
 *   - Schritt 1 (Aufgabe approved)         → kein Lock; nur sync-relevant.
 *   - Schritt 2 (Dashboard locked_for_export) → kein Inhalts-Lock; nur Komposition.
 *   - Schritt 3 (Einheit final_freigegeben) → ALLE Aufgaben dieser Einheit
 *     sind read-only (Tab 5 wird gesperrt).
 *
 * Die API der beiden Funktionen bleibt stabil (`{ locked, by_pfade }`),
 * damit alle Aufrufer (AufgabeCreateView, Cockpit-Ampel etc.) ohne Eingriff
 * weiter funktionieren. `by_pfade` ist seit Schritt 3 leer, weil der Lock
 * die ganze Einheit betrifft und nicht mehr an einzelne Lerntypen gebunden ist.
 */

import { base44 } from '@/api/base44Client';
import { PFAD_STATUS } from '@/lib/pfadStatus';

// Bewusst exportiert für Cockpit-Tooling, das den DB-Wert braucht.
export const LOCK_STATUS = PFAD_STATUS.LOCKED;

const EINHEIT_FINAL = 'final_freigegeben';

async function isEinheitFinalFreigegeben(einheitId) {
  if (!einheitId) return false;
  const einheit = await base44.entities.Einheiten.get(einheitId);
  return einheit?.einheit_freigabe_status === EINHEIT_FINAL;
}

/**
 * Lock-Status für eine einzelne Aufgabe.
 *
 * Liefert `locked: true`, sobald die zugehörige Einheit final freigegeben
 * wurde. `by_pfade` bleibt leer, weil die Sperre die Einheit als Ganzes
 * betrifft (siehe Datei-Header).
 *
 * @param {string} aufgabeId
 * @returns {Promise<{ locked: boolean, by_pfade: string[] }>}
 */
export async function isAufgabeLocked(aufgabeId) {
  if (!aufgabeId) return { locked: false, by_pfade: [] };
  const aufgabe = await base44.entities.AllgemeineAufgabe.get(aufgabeId);
  if (!aufgabe?.einheit_id) return { locked: false, by_pfade: [] };
  const locked = await isEinheitFinalFreigegeben(aufgabe.einheit_id);
  return { locked, by_pfade: [] };
}

/**
 * Batched Lock-Status für alle Aufgaben einer Einheit.
 *
 * Bei einer final freigegebenen Einheit gelten alle Aufgaben als gesperrt;
 * wir markieren sie hier alle einheitlich. Bei einer Draft-Einheit ist die
 * Map leer ("nicht in der Map" = "ungelockt").
 *
 * @param {string} einheitId
 * @returns {Promise<Map<string, { locked: boolean, by_pfade: string[] }>>}
 */
export async function getLockStatusBatchByEinheit(einheitId) {
  const result = new Map();
  if (!einheitId) return result;
  const final = await isEinheitFinalFreigegeben(einheitId);
  if (!final) return result;

  const aufgaben = await base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
  for (const a of aufgaben || []) {
    if (a?.id) result.set(a.id, { locked: true, by_pfade: [] });
  }
  return result;
}