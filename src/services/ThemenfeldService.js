/**
 * ThemenfeldService.js
 *
 * Service-Layer für die Themenfeld-Entität.
 * Einzige Datei, die base44Client für Themenfelder importieren darf.
 * Ziel: Plattformunabhängige UI-Komponenten – nur dieser Service muss
 * bei einer Migration (z.B. zu Supabase) angepasst werden.
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Themenfelder einer Einheit laden (sortiert nach reihenfolge).
 */
export async function getThemenfelderByEinheit(einheitId) {
  const result = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
  return result.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
}

/**
 * Einzelnes Themenfeld anlegen.
 */
export async function createThemenfeld({ einheitId, titel, reihenfolge }) {
  return base44.entities.Themenfeld.create({
    einheit_id: einheitId,
    titel,
    reihenfolge,
  });
}

/**
 * Themenfeld aktualisieren (z.B. Titel oder Reihenfolge).
 */
export async function updateThemenfeld(id, data) {
  return base44.entities.Themenfeld.update(id, data);
}

/**
 * Themenfeld löschen.
 */
export async function deleteThemenfeld(id) {
  return base44.entities.Themenfeld.delete(id);
}