/**
 * RBAC — Role-Based Access Control für PoolPlaner
 *
 * Rollen:
 *  Administrator       — Vollzugriff auf alles
 *  Fachschaftsleitung  — Lesen global, Schreiben/Löschen im eigenen Fach + freigabe_status
 *  Fachlehrkraft       — Lesen global, Schreiben/Löschen auf LP/LZ/AB im eigenen Fach (kein freigabe_status)
 *  Betrachter          — Nur lesen, alle Einheiten
 *  Moodle-Designer     — Nur lesen, NUR freigegebene Einheiten
 */

export const ROLLEN = {
  ADMIN: 'Administrator',
  FACHSCHAFT: 'Fachschaftsleitung',
  LEHRKRAFT: 'Fachlehrkraft',
  BETRACHTER: 'Betrachter',
  MOODLE: 'Moodle-Designer',
};

/**
 * Prüft ob der Benutzer-Profil-Datensatz (Benutzer-Entity) geladen ist.
 * Gibt sicheren Fallback zurück wenn kein Profil existiert.
 */
export function getEffectiveRolle(benutzerProfil) {
  return benutzerProfil?.rolle || ROLLEN.BETRACHTER;
}

/**
 * Darf der Nutzer generell schreibend tätig sein?
 */
export function kannSchreiben(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT, ROLLEN.LEHRKRAFT].includes(rolle);
}

/**
 * Darf der Nutzer eine Einheit (oder deren Kinder) bearbeiten?
 * Berücksichtigt Fachzuständigkeit.
 */
export function kannEinheitBearbeiten(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT || rolle === ROLLEN.LEHRKRAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Darf der Nutzer den freigabe_status einer Einheit ändern?
 * Nur Administrator und Fachschaftsleitung (im eigenen Fach).
 */
export function kannFreigabeStatusAendern(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Darf der Nutzer eine Einheit in der Liste sehen?
 * Moodle-Designer: nur freigegebene. Alle anderen: alle.
 */
export function kannEinheitSehen(rolle, einheitFreigabeStatus) {
  if (rolle === ROLLEN.MOODLE) {
    return einheitFreigabeStatus === 'Freigegeben für Moodle';
  }
  return true;
}

/**
 * Darf der Nutzer den Benutzerverwaltungs-Bereich sehen?
 */
export function kannBenutzerverwaltungSehen(rolle) {
  return rolle === ROLLEN.ADMIN;
}

/**
 * Darf der Nutzer Export-Funktionen nutzen?
 */
export function kannExportieren(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.MOODLE].includes(rolle);
}

/**
 * Berechnet die vollständige Permissions-Map für eine Rolle.
 * Nützlich für UI-Entscheidungen.
 */
export function getPermissions(rolle, benutzerFaecher = []) {
  return {
    rolle,
    faecher: benutzerFaecher,
    kannSchreiben: kannSchreiben(rolle),
    kannLoeschen: [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT, ROLLEN.LEHRKRAFT].includes(rolle),
    kannFreigabeAendern: [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle),
    kannBenutzerVerwalten: rolle === ROLLEN.ADMIN,
    kannExportieren: kannExportieren(rolle),
    nurFreigegebene: rolle === ROLLEN.MOODLE,
    // Hilfsfunktionen mit Fach-Kontext
    kannEinheitBearbeiten: (fach) => kannEinheitBearbeiten(rolle, benutzerFaecher, fach),
    kannFreigabeStatusAendern: (fach) => kannFreigabeStatusAendern(rolle, benutzerFaecher, fach),
  };
}