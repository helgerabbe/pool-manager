/**
 * RBAC — Role-Based Access Control für PoolPlaner
 *
 * ┌─────────────────────┬───────┬──────────┬───────────┬───────────┬────────────┐
 * │ Berechtigung        │ ADMIN │ FACHSCH. │ LEHRKRAFT │ BETRACHT. │ MOODLE-DS. │
 * ├─────────────────────┼───────┼──────────┼───────────┼───────────┼────────────┤
 * │ Einheit erstellen   │  ✓    │    ✓     │           │           │            │
 * │ Einheit löschen     │  ✓    │    ✓     │           │           │            │
 * │ Struktur-Board      │  ✓    │    ✓     │  (lesen)  │  (lesen)  │  (lesen)   │
 * │ Themenfeld löschen  │  ✓    │    ✓     │           │           │            │
 * │ Inhalte bearbeiten  │  ✓    │    ✓     │    ✓      │           │            │
 * │ LP verschieben      │  ✓    │    ✓     │    ✓      │           │            │
 * │ Moodle-Export       │  ✓    │    ✓     │           │           │    ✓       │
 * │ Benutzerverwaltung  │  ✓    │          │           │           │            │
 * │ Freigabe ändern     │  ✓    │    ✓     │           │           │            │
 * │ KI-Assistent        │  ✓    │    ✓     │           │           │            │
 * └─────────────────────┴───────┴──────────┴───────────┴───────────┴────────────┘
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
 * ADMIN + FACHSCHAFTSLEITUNG können exportieren (triggern den Export).
 * MOODLE-Designer kann nur lesen/anzeigen, nicht exportieren.
 */
export function kannExportieren(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle);
}

/**
 * Darf der Nutzer das Struktur-Board bearbeiten?
 * (Themenfelder anlegen, löschen, umbenennen, Pakete strukturell verschieben)
 * Lehrkräfte haben nur Lesezugriff auf das Board.
 */
export function kannStrukturBearbeiten(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Darf der Nutzer Themenfelder löschen?
 * Nur ADMIN und FACHSCHAFTSLEITUNG.
 */
export function kannThemenfeldLoeschen(rolle, benutzerFaecher, einheitFach) {
  return kannStrukturBearbeiten(rolle, benutzerFaecher, einheitFach);
}

/**
 * Darf der Nutzer Einheiten erstellen oder löschen?
 */
export function kannEinheitVerwalten(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle);
}

/**
 * Darf der Nutzer den KI-Lernpaket-Assistenten nutzen?
 * Nur Administrator und Fachschaftsleitung.
 */
export function kannKIAssistentNutzen(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle);
}

/**
 * Berechnet die vollständige Permissions-Map für eine Rolle.
 * Nützlich für UI-Entscheidungen.
 */
export function getPermissions(rolle, benutzerFaecher = []) {
  return {
    rolle,
    faecher: benutzerFaecher,
    kannSchreiben:         kannSchreiben(rolle),
    kannLoeschen:          [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT, ROLLEN.LEHRKRAFT].includes(rolle),
    kannFreigabeAendern:   [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle),
    kannBenutzerVerwalten: rolle === ROLLEN.ADMIN,
    kannExportieren:       kannExportieren(rolle),
    kannKIAssistentNutzen: kannKIAssistentNutzen(rolle),
    kannEinheitVerwalten:  kannEinheitVerwalten(rolle),
    nurFreigegebene:       rolle === ROLLEN.MOODLE,
    istGast:               [ROLLEN.BETRACHTER, ROLLEN.MOODLE].includes(rolle),
    // Fach-kontextabhängige Hilfsfunktionen
    kannEinheitBearbeiten:       (fach) => kannEinheitBearbeiten(rolle, benutzerFaecher, fach),
    kannFreigabeStatusAendern:   (fach) => kannFreigabeStatusAendern(rolle, benutzerFaecher, fach),
    kannStrukturBearbeiten:      (fach) => kannStrukturBearbeiten(rolle, benutzerFaecher, fach),
    kannThemenfeldLoeschen:      (fach) => kannThemenfeldLoeschen(rolle, benutzerFaecher, fach),
  };
}