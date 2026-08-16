/**
 * base44/shared/offeneFaecher.js
 *
 * Offene Fächer (2026-08-16): Fächer mit LookupFaecher.ist_offen_fuer_alle=true
 * gelten automatisch als zuständiges Fach für JEDE schreibende Lehrkraft
 * (Fachschaftsleitung wie Fachlehrkraft) — in der INHALTE-Dimension
 * (Fachlehrkraft-Rechte). Sie zählen NICHT in die 5-Fächer-Grenze und
 * erzeugen KEINE automatische Fachschaftsleitung.
 *
 * Genutzt von: unitAccess.js, freigabeShared.js, updateActivitySecure.
 * Frontend-Pendant: useRBAC (offeneFaecher) + getPermissions in src/lib/rbac.js.
 */

export async function getOffeneFaecherNamen(base44) {
  const offene = await base44.asServiceRole.entities.LookupFaecher.filter({
    ist_offen_fuer_alle: true,
    ist_aktiv: true,
  });
  return (offene || []).map((f) => f.name);
}

export async function istOffenesFach(base44, fach) {
  if (!fach) return false;
  const namen = await getOffeneFaecherNamen(base44);
  return namen.includes(fach);
}