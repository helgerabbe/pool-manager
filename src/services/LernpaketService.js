/**
 * LernpaketService.js
 *
 * Service-Layer für die Lernpakete-Entität.
 * Einzige Datei, die base44Client für Lernpakete importieren darf.
 * Bei einer Migration (z.B. zu Supabase) wird nur diese Datei angepasst.
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Lernpakete einer Einheit laden (sortiert nach reihenfolge_nummer).
 */
export async function getLernpaketeByEinheit(einheitId) {
  const result = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
  return result.sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
}

/**
 * Alle Lernpakete eines Themenfelds laden.
 */
export async function getLernpaketeByThemenfeld(themenfeldId) {
  const result = await base44.entities.Lernpakete.filter({ themenfeld_id: themenfeldId });
  return result.sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
}

/**
 * Neues Lernpaket anlegen.
 */
export async function createLernpaket(data) {
  return base44.entities.Lernpakete.create(data);
}

/**
 * Lernpaket aktualisieren (z.B. themenfeld_id, reihenfolge_nummer, Titel).
 */
export async function updateLernpaket(id, data) {
  return base44.entities.Lernpakete.update(id, data);
}

/**
 * Lernpaket löschen.
 */
export async function deleteLernpaket(id) {
  return base44.entities.Lernpakete.delete(id);
}

/**
 * Alle Lernpakete laden (global, z.B. für übergreifende Listen).
 */
export async function getAllLernpakete() {
  return base44.entities.Lernpakete.list('-created_date', 200);
}