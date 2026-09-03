/**
 * shared/pruefungAccess.js
 *
 * Rechte der Export-Vorprüfung (Prüfbereich Tab 8, 2026-09-03).
 *
 * Gestuftes Modell:
 *   – Prüfung STARTEN und Befunde als „bewusst gelassen" markieren:
 *     Admin, Fachschaftsleitung des Fachs, EinheitMembers mit unit_role LEITUNG
 *     (die Leitung vererbt ihre Rechte an benannte Mitarbeiter).
 *   – Befunde ABARBEITEN (als „behoben" markieren, wieder öffnen):
 *     jede Person mit Schreibrecht in der Einheit (hasUnitWriteAccess).
 */

import { isAdmin, isFachschaftForFach, hasUnitWriteAccess } from './unitAccess.js';

export async function hasPruefungLeitungAccess(base44, user, einheit) {
  const [profiles, memberships] = await Promise.all([
    base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }),
    base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheit.id,
      user_email: user.email,
    }),
  ]);
  const profile = profiles?.[0] || null;
  if (isAdmin(user, profile) || isFachschaftForFach(profile, einheit.fach)) return true;
  return memberships?.[0]?.unit_role === 'LEITUNG';
}

export async function hasPruefungBearbeitenAccess(base44, user, einheit) {
  return hasUnitWriteAccess(base44, user, einheit);
}

/** Baut den stabilen Wiedererkennungs-Schlüssel eines Befunds. */
export function buildBefundFingerprint(zielTyp, zielId, kategorie) {
  return `${zielTyp}:${zielId}:${kategorie}`;
}