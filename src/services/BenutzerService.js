/**
 * BenutzerService.js
 *
 * Service-Layer für Benutzer-Profile und Systemeinstellungen.
 *
 * MIGRATIONSHINWEIS:
 * - `getBenutzerByEmail(email)` → supabase.from('benutzer').select('*').eq('user_id', email)
 * - `getSystemeinstellungen()` → supabase.from('systemeinstellungen').select('*')
 */

import { base44 } from '@/api/base44Client';

/**
 * Benutzerprofil anhand der E-Mail (user_id) laden.
 * Gibt ein Array zurück (ggf. leer wenn kein Profil vorhanden).
 */
export async function getBenutzerByEmail(email) {
  return base44.entities.Benutzer.filter({ user_id: email });
}

/**
 * Alle Systemeinstellungen laden.
 */
export async function getSystemeinstellungen() {
  return base44.entities.Systemeinstellungen.list();
}