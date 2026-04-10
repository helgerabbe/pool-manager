/**
 * EinheitenService.js
 *
 * Service-Layer für die Einheiten-Entität.
 * Einzige Datei, die base44Client für Einheiten importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getAllEinheiten()` → bei Supabase: supabase.from('einheiten').select('*').order('created_at', { ascending: false })
 * - `getEinheitById(id)` → supabase.from('einheiten').select('*').eq('id', id).single()
 * - `createEinheit(data)` → supabase.from('einheiten').insert(data).select().single()
 * - `updateEinheit(id, data)` → supabase.from('einheiten').update(data).eq('id', id).select().single()
 * - `deleteEinheit(id)` → supabase.from('einheiten').delete().eq('id', id)
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Einheiten laden (sortiert nach Erstellungsdatum, neueste zuerst).
 */
export async function getAllEinheiten() {
  return base44.entities.Einheiten.list('-created_date');
}

/**
 * Einzelne Einheit per ID laden.
 */
export async function getEinheitById(id) {
  const result = await base44.entities.Einheiten.filter({ id });
  return result[0] || null;
}

/**
 * Einheiten nach beliebigen Feldern filtern.
 */
export async function filterEinheiten(query) {
  return base44.entities.Einheiten.filter(query);
}

/**
 * Neue Einheit anlegen.
 */
export async function createEinheit(data) {
  return base44.entities.Einheiten.create(data);
}

/**
 * Einheit aktualisieren.
 */
export async function updateEinheit(id, data) {
  return base44.entities.Einheiten.update(id, data);
}

/**
 * Einheit löschen.
 */
export async function deleteEinheit(id) {
  return base44.entities.Einheiten.delete(id);
}