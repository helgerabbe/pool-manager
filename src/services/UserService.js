/**
 * UserService.js
 *
 * Service-Layer für Benutzerprofile und Rollen-Management.
 * Einzige Datei, die base44.entities.User / base44.auth.updateMe /
 * base44.users importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getCurrentUser()` → bei Supabase: profiles-Tabelle per user.id joinen
 * - `updateProfile()` → bei Supabase: supabase.from('profiles').update(data).eq('id', userId)
 * - `getAllUsers()` → bei Supabase: supabase.from('profiles').select('*') (nur Admin)
 * - `inviteUser()` → bei Supabase: supabase.auth.admin.inviteUserByEmail(email)
 */

import { base44 } from '@/api/base44Client';

/**
 * Gibt das Profil des aktuell eingeloggten Users zurück.
 */
export async function getCurrentUser() {
  return base44.auth.me();
}

/**
 * Aktualisiert das Profil des aktuell eingeloggten Users.
 * Nur editierbare Felder (keine id, email, full_name, role überschreibbar).
 */
export async function updateProfile(data) {
  return base44.auth.updateMe(data);
}

/**
 * Alle registrierten User laden (nur für Admin-Ansichten).
 * Bei Supabase: RLS-Policies sicherstellen!
 */
export async function getAllUsers() {
  return base44.entities.User.list();
}

/**
 * Einen neuen User per E-Mail einladen.
 * @param {string} email
 * @param {'user'|'admin'} role
 */
export async function inviteUser(email, role = 'user') {
  return base44.users.inviteUser(email, role);
}