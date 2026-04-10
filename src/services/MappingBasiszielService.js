/**
 * MappingBasiszielService.js
 *
 * Service-Layer für die MappingAufgabeBasisziel-Entität.
 *
 * MIGRATIONSHINWEIS:
 * - `getAllMappingBasisziele()` → supabase.from('mapping_aufgabe_basisziel').select('*')
 * - `getMappingsByAufgabeId(id)` → supabase.from(...).select('*').eq('aufgabe_id', id)
 * - `createMappingBasisziel(data)` → supabase.from(...).insert(data).select().single()
 * - `deleteMappingBasisziel(id)` → supabase.from(...).delete().eq('id', id)
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Aufgabe-Basisziel-Mappings laden.
 */
export async function getAllMappingBasisziele() {
  return base44.entities.MappingAufgabeBasisziel.list();
}

/**
 * Mappings für eine bestimmte Aufgabe laden.
 */
export async function getMappingsByAufgabeId(aufgabeId) {
  return base44.entities.MappingAufgabeBasisziel.filter({ aufgabe_id: aufgabeId });
}

/**
 * Neues Mapping anlegen.
 */
export async function createMappingBasisziel(data) {
  return base44.entities.MappingAufgabeBasisziel.create(data);
}

/**
 * Mapping löschen.
 */
export async function deleteMappingBasisziel(id) {
  return base44.entities.MappingAufgabeBasisziel.delete(id);
}