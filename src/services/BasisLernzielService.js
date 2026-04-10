/**
 * BasisLernzielService.js
 *
 * Service-Layer für BasisLernziel und Basismodule.
 *
 * MIGRATIONSHINWEIS:
 * - `getAllBasisLernziele()` → supabase.from('basis_lernziel').select('*')
 * - `getAllBasismodule()` → supabase.from('basismodule').select('*')
 * - `getBasisLernzieleByModul(modulId)` → supabase.from('basis_lernziel').select('*').eq('modul_id', modulId)
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Basis-Lernziele laden.
 */
export async function getAllBasisLernziele() {
  return base44.entities.BasisLernziel.list();
}

/**
 * Alle Basismodule laden.
 */
export async function getAllBasismodule() {
  return base44.entities.Basismodule.list();
}