/**
 * shared/importAuftragAccess.js
 *
 * Wer darf das Import-Center bedienen? Aufträge greifen tief in fremde
 * Einheiten ein — deshalb dieselbe Schranke wie beim Export: Administratoren
 * und Fachschaftsleitungen. Eine einzige Stelle, die alle Import-Funktionen
 * benutzen, damit keine Funktion versehentlich offener ist als die anderen.
 */

export async function hatImportCenterZugang(base44, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const rolle = profile?.[0]?.rolle;
  return rolle === 'Administrator' || rolle === 'Fachschaftsleitung';
}

export const ZUGANG_FEHLER =
  'Das Import-Center ist Administratoren und der Fachschaftsleitung vorbehalten.';