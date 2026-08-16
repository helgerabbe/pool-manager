/**
 * shared/unitAccess.js
 *
 * Gemeinsame Schreibrechte-Prüfung für Einheiten, genutzt von den
 * Lernpaket-Wizard-Funktionen (generateLernpaketAktivitaeten,
 * generateWizardAktivitaetInhalt).
 *
 * Regeln (identisch zur bisherigen Inline-Logik):
 *   – Admin (Base44-Rolle oder Benutzer.rolle 'Administrator') → immer.
 *   – Fachschaftsleitung mit Zuständigkeit für das Fach der Einheit.
 *   – EinheitMembers mit unit_role LEITUNG oder EDITOR.
 *   – Offene Fächer (2026-08-16): jede schreibende Lehrkraft im offenen Fach.
 */

import { istOffenesFach } from './offeneFaecher.js';

export function isAdmin(user, profile) {
  return user?.role === 'admin' || user?.role === 'Administrator' || profile?.rolle === 'Administrator';
}

export function isFachschaftForFach(profile, fach) {
  if (profile?.rolle !== 'Fachschaftsleitung') return false;
  const faecher = Array.isArray(profile.fachbereich_zustaendigkeit)
    ? profile.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

/**
 * RBAC-Angleichung (2026-08-11, Bugfix "keine Schreibrechte für dieses Lernpaket"):
 * Die Frontend-Matrix (lib/rbac.js, Bereich 2 INHALTE) und updateActivitySecure
 * erlauben der FACHLEHRKRAFT die Inhalts-Bearbeitung im eigenen Fach — ohne
 * delegierte EinheitMembers-Rolle. Diese Datei verlangte zusätzlich eine
 * Mitgliedschaft und wies fachzuständige Lehrkräfte ab (z. B. beim
 * KI-Button "Kompaktwissen").
 */
export function isLehrkraftForFach(profile, fach) {
  if (profile?.rolle !== 'Fachlehrkraft') return false;
  const faecher = Array.isArray(profile.fachbereich_zustaendigkeit)
    ? profile.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

export async function hasUnitWriteAccess(base44, user, einheit) {
  const [profiles, memberships] = await Promise.all([
    base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }),
    base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheit.id,
      user_email: user.email,
    }),
  ]);

  const profile = profiles?.[0] || null;
  if (
    isAdmin(user, profile) ||
    isFachschaftForFach(profile, einheit.fach) ||
    isLehrkraftForFach(profile, einheit.fach)
  ) return true;

  const membership = memberships?.[0] || null;
  if (membership?.unit_role === 'LEITUNG' || membership?.unit_role === 'EDITOR') return true;

  // Offene Fächer (2026-08-16): In einem offenen Fach agiert jede schreibende
  // Lehrkraft (Fachschaftsleitung wie Fachlehrkraft) als Fachlehrkraft.
  const schreibRolle = profile?.rolle === 'Fachschaftsleitung' || profile?.rolle === 'Fachlehrkraft';
  if (schreibRolle && (await istOffenesFach(base44, einheit.fach))) return true;

  return false;
}