/**
 * shared/importAuftragAccess.js
 *
 * Wer darf das Import-Center bedienen? Zwei Stufen:
 *  - VOLLZUGANG: Administratoren und Fachschaftsleitungen — alle Aufträge,
 *    auch Aufträge stellen.
 *  - MITARBEITER (2026-09-27): Wer in einer Einheit als Mitarbeiter eingetragen
 *    ist (EinheitMembers, Rolle LEITUNG oder EDITOR), darf die Aufträge GENAU
 *    DIESER Einheit sehen, durchführen und ablehnen. Bewusst nicht alle
 *    Fachlehrkräfte: Wer eine Einheit nicht mitverantwortet, soll auch nicht
 *    über fremde Änderungen daran entscheiden.
 */

const MITARBEITER_ROLLEN = ['LEITUNG', 'EDITOR'];

export async function hatImportCenterZugang(base44, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const rolle = profile?.[0]?.rolle;
  return rolle === 'Administrator' || rolle === 'Fachschaftsleitung';
}

export async function istEinheitMitarbeiter(base44, user, einheitId) {
  if (!user || !einheitId) return false;
  const mitglied = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheitId,
    user_email: user.email,
  });
  return (mitglied || []).some((m) => MITARBEITER_ROLLEN.includes(m.unit_role));
}

/** Vollzugang ODER Mitarbeiter der Einheit, in der der Auftrag wirkt. */
export async function hatAuftragZugang(base44, user, einheitId) {
  if (await hatImportCenterZugang(base44, user)) return true;
  return istEinheitMitarbeiter(base44, user, einheitId);
}

export const ZUGANG_FEHLER =
  'Das Import-Center ist Administratoren, der Fachschaftsleitung und den Mitarbeitern der jeweiligen Einheit vorbehalten.';