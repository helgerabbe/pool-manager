/**
 * EinheitMembersService.js
 *
 * Service-Layer für die EinheitMembers-Entität (Rollen/Nutzer-Zuordnung
 * innerhalb einer Einheit).
 * Einzige Datei, die base44Client für EinheitMembers importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getMembersByEinheit(id)` → supabase.from('einheit_members').select('*').eq('einheit_id', id)
 * - `getMembershipByEinheitAndUser(einheitId, email)` →
 *     supabase.from('einheit_members').select('*').eq('einheit_id', einheitId).eq('user_email', email).single()
 * - `addEinheitMember(data)` → supabase.from('einheit_members').insert(data).select().single()
 * - `updateEinheitMemberRole(id, role)` → supabase.from('einheit_members').update({ unit_role: role }).eq('id', id)
 * - `removeEinheitMember(id)` → supabase.from('einheit_members').delete().eq('id', id)
 */

import { base44 } from '@/api/base44Client';

/**
 * Alle Mitglieder einer Einheit laden.
 */
export async function getMembersByEinheit(einheitId) {
  return base44.entities.EinheitMembers.filter({ einheit_id: einheitId });
}

/**
 * Einzelne Mitgliedschaft eines Users in einer Einheit laden.
 * Gibt das erste Ergebnis zurück (oder undefined).
 */
export async function getMembershipByEinheitAndUser(einheitId, userEmail) {
  const result = await base44.entities.EinheitMembers.filter({
    einheit_id: einheitId,
    user_email: userEmail,
  });
  return result[0] || null;
}

/**
 * Neues Mitglied einer Einheit hinzufügen.
 */
export async function addEinheitMember(data) {
  return base44.entities.EinheitMembers.create(data);
}

/**
 * Rolle eines Mitglieds aktualisieren.
 */
export async function updateEinheitMemberRole(memberId, role) {
  return base44.entities.EinheitMembers.update(memberId, { unit_role: role });
}

/**
 * Mitglied aus einer Einheit entfernen.
 */
export async function removeEinheitMember(memberId) {
  return base44.entities.EinheitMembers.delete(memberId);
}