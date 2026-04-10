/**
 * PresenceService.js
 *
 * Service-Layer für die ActiveUsersPresence-Entität.
 * Kapselt alle Echtzeit-Präsenz-Operationen und Auth-Zugriff.
 *
 * MIGRATIONSHINWEIS:
 * - `listPresence()` → supabase.from('active_users_presence').select('*')
 * - `filterPresenceByEmail(email)` → supabase.from(...).select('*').eq('user_email', email)
 * - `createPresenceRecord(data)` → supabase.from(...).insert(data).select().single()
 * - `updatePresenceRecord(id, data)` → supabase.from(...).update(data).eq('id', id)
 * - `deletePresenceRecord(id)` → supabase.from(...).delete().eq('id', id)
 * - `subscribeToPresence(cb)` → supabase.channel('presence').on('postgres_changes', ..., cb).subscribe()
 * - `getCurrentUser()` → Already in AuthService — use that instead
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle aktiven Präsenz-Einträge laden.
 */
export async function listPresence() {
  return base44.entities.ActiveUsersPresence.list();
}

/**
 * Präsenz-Einträge eines bestimmten Nutzers laden.
 */
export async function filterPresenceByEmail(email) {
  return base44.entities.ActiveUsersPresence.filter({ user_email: email });
}

/**
 * Neuen Präsenz-Eintrag anlegen.
 */
export async function createPresenceRecord(data) {
  return base44.entities.ActiveUsersPresence.create(data);
}

/**
 * Bestehenden Präsenz-Eintrag aktualisieren (Heartbeat).
 */
export async function updatePresenceRecord(id, data) {
  return base44.entities.ActiveUsersPresence.update(id, data);
}

/**
 * Präsenz-Eintrag löschen.
 */
export async function deletePresenceRecord(id) {
  return base44.entities.ActiveUsersPresence.delete(id);
}

/**
 * Realtime-Subscription auf Präsenz-Änderungen.
 * Gibt die Unsubscribe-Funktion zurück.
 */
export function subscribeToPresence(callback) {
  return base44.entities.ActiveUsersPresence.subscribe(callback);
}