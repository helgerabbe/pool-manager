/**
 * lernpfadLockUtils.js
 *
 * Lese-Helfer für die Inhalts-Sperre einer Aufgabe.
 *
 * Phase A: die Sperre hängt jetzt am neuen `export_lifecycle_status` der
 * Einheit. Aufgaben gelten als gesperrt, sobald `isContentLocked(status)`
 * true liefert (also bei 'final_freigegeben' oder 'export_running').
 *
 * Die API der beiden Funktionen bleibt stabil (`{ locked, by_pfade }`),
 * damit alle Aufrufer (AufgabeCreateView, Cockpit-Ampel etc.) ohne Eingriff
 * weiter funktionieren.
 */

import { base44 } from '@/api/base44Client';
import { PFAD_STATUS } from '@/lib/pfadStatus';
import { isContentLocked } from '@/lib/exportLifecycle';

// Bewusst exportiert für Cockpit-Tooling, das den DB-Wert braucht.
export const LOCK_STATUS = PFAD_STATUS.LOCKED;

async function isEinheitContentLocked(einheitId) {
  if (!einheitId) return false;
  const einheit = await base44.entities.Einheiten.get(einheitId);
  return isContentLocked(einheit?.export_lifecycle_status);
}

/**
 * Lock-Status für eine einzelne Aufgabe.
 */
export async function isAufgabeLocked(aufgabeId) {
  if (!aufgabeId) return { locked: false, by_pfade: [] };
  const aufgabe = await base44.entities.AllgemeineAufgabe.get(aufgabeId);
  if (!aufgabe?.einheit_id) return { locked: false, by_pfade: [] };
  const locked = await isEinheitContentLocked(aufgabe.einheit_id);
  return { locked, by_pfade: [] };
}

/**
 * Batched Lock-Status für alle Aufgaben einer Einheit.
 */
export async function getLockStatusBatchByEinheit(einheitId) {
  const result = new Map();
  if (!einheitId) return result;
  const locked = await isEinheitContentLocked(einheitId);
  if (!locked) return result;

  const aufgaben = await base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId });
  for (const a of aufgaben || []) {
    if (a?.id) result.set(a.id, { locked: true, by_pfade: [] });
  }
  return result;
}