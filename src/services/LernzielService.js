/**
 * LernzielService.js
 *
 * Service-Layer für die Lernziele-Entität.
 * Einzige Datei, die base44Client für Lernziele importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getAllLernziele()` → supabase.from('lernziele').select('*').order('created_at', { ascending: false })
 * - `getLernzieleByLernpaket(id)` → supabase.from('lernziele').select('*').eq('lernpaket_id', id)
 * - `createLernziel(data)` → supabase.from('lernziele').insert(data).select().single()
 * - `updateLernziel(id, data)` → supabase.from('lernziele').update(data).eq('id', id).select().single()
 * - `deleteLernziel(id)` → supabase.from('lernziele').delete().eq('id', id)
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Lernziele laden (global, z.B. für den Workspace-Baum).
 */
export async function getAllLernziele() {
  return base44.entities.Lernziele.list('-created_date', 500);
}

/**
 * Alle Lernziele eines bestimmten Lernpakets laden.
 */
export async function getLernzieleByLernpaket(lernpaketId) {
  return base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId });
}

/**
 * Neues Lernziel anlegen.
 */
export async function createLernziel(data) {
  return base44.entities.Lernziele.create(data);
}

/**
 * Lernziel aktualisieren.
 */
export async function updateLernziel(id, data) {
  return base44.entities.Lernziele.update(id, data);
}

/**
 * Lernziel löschen.
 */
export async function deleteLernziel(id) {
  return base44.entities.Lernziele.delete(id);
}