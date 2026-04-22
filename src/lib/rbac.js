/**
 * RBAC — Role-Based Access Control für Pool-Manager
 *
 * ┌──────────────────────────┬───────┬──────────┬───────────┬───────────┬────────────┐
 * │ Berechtigung             │ ADMIN │ FACHSCH. │ LEHRKRAFT │ BETRACHT. │ MOODLE-DS. │
 * ├──────────────────────────┼───────┼──────────┼───────────┼───────────┼────────────┤
 * │ BEREICH 1: STRUKTUR      │       │          │           │           │            │
 * │ Einheit erstellen        │  ✓    │    ✓     │           │           │            │
 * │ Einheit löschen          │  ✓    │    ✓     │           │           │            │
 * │ Struktur bearbeiten      │  ✓    │    ✓*    │           │           │            │
 * ├──────────────────────────┼───────┼──────────┼───────────┼───────────┼────────────┤
 * │ BEREICH 2: INHALTE       │       │          │           │           │            │
 * │ Aktivität erstellen      │  ✓    │    ✓*    │    ✓*     │           │            │
 * │ Aktivität bearbeiten     │  ✓    │    ✓*    │    ✓*     │           │            │
 * │ Aktivität löschen        │  ✓    │    ✓*    │    ✓*     │           │            │
 * │ Aktivität freigeben      │  ✓    │    ✓*    │    ✓*     │           │            │
 * ├──────────────────────────┼───────┼──────────┼───────────┼───────────┼────────────┤
 * │ BEREICH 3: EXPORT        │       │          │           │           │            │
 * │ Export bedienen          │  ✓    │          │           │           │    ✓       │
 * │ Export lesen             │  ✓    │    ✓     │    ✓      │           │    ✓       │
 * └──────────────────────────┴───────┴──────────┴───────────┴───────────┴────────────┘
 * * = nur im zuständigen Fachbereich
 */

import { ROLLEN } from './rbacConfig';

export { ROLLEN };

/**
 * Prüft ob der Benutzer-Profil-Datensatz (Benutzer-Entity) geladen ist.
 * Gibt sicheren Fallback zurück wenn kein Profil existiert.
 */
export function getEffectiveRolle(benutzerProfil) {
  return benutzerProfil?.rolle || ROLLEN.BETRACHTER;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEREICH 1: STRUKTUR (Einheiten, Themenfelder, Lernpakete)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Darf der Nutzer die Struktur bearbeiten?
 * (Einheiten/Themenfelder/Lernpakete erstellen, bearbeiten, löschen)
 * Nur ADMIN und FACHSCHAFTSLEITUNG (im eigenen Fachbereich).
 */
export function kannStrukturBearbeiten(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Darf der Nutzer Einheiten erstellen/verwalten?
 */
export function kannEinheitVerwalten(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle);
}

/**
 * Darf der Nutzer Themenfelder löschen?
 */
export function kannThemenfeldLoeschen(rolle, benutzerFaecher, einheitFach) {
  return kannStrukturBearbeiten(rolle, benutzerFaecher, einheitFach);
}

// ─────────────────────────────────────────────────────────────────────────────
// BEREICH 2: INHALTE (Aktivitäten, Aufgaben)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Darf der Nutzer Inhalte bearbeiten?
 * (Aktivitäten, Aufgaben erstellen, bearbeiten, löschen, freigeben)
 * ADMIN + FACHSCHAFTSLEITUNG (eigene Fächer) + LEHRKRAFT (eigene Fächer).
 */
export function kannInhalteBearbeiten(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT || rolle === ROLLEN.LEHRKRAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Darf der Nutzer Aktivitäten/Aufgaben freigeben?
 * (nur wenn auch Inhalte bearbeiten darf)
 */
export function kannInhaltFreigeben(rolle, benutzerFaecher, einheitFach) {
  return kannInhalteBearbeiten(rolle, benutzerFaecher, einheitFach);
}

/**
 * Darf der Nutzer eine Einheit (oder deren Kinder) bearbeiten?
 * (für Inhalts-Bearbeitung, nicht Struktur)
 * Berücksichtigt Fachzuständigkeit.
 */
export function kannEinheitBearbeiten(rolle, benutzerFaecher, einheitFach) {
  return kannInhalteBearbeiten(rolle, benutzerFaecher, einheitFach);
}

// ─────────────────────────────────────────────────────────────────────────────
// BEREICH 3: EXPORT (Moodle-Export)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Darf der Nutzer Export bedienen?
 * (Aktivitäten für Export markieren, Export abschließen)
 * Nur MOODLE-DESIGNER und ADMIN.
 */
export function kannExportBedienen(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.MOODLE].includes(rolle);
}

/**
 * Darf der Nutzer den Export-Bereich lesen?
 * (alle außer Betrachter können lesen, aber nicht bedienen)
 */
export function kannExportLesen(rolle) {
  return rolle !== ROLLEN.BETRACHTER;
}

/**
 * Alias für alte API (Rückwärtskompatibilität)
 * Nur ADMIN und FACHSCHAFTSLEITUNG konnten früher exportieren.
 * Jetzt können nur ADMIN und MOODLE-DESIGNER exportieren.
 */
export function kannExportieren(rolle) {
  return kannExportBedienen(rolle);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY / ALLGEMEIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Darf der Nutzer generell schreibend tätig sein?
 * (admin, fachschaft, lehrkraft)
 */
export function kannSchreiben(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT, ROLLEN.LEHRKRAFT].includes(rolle);
}

/**
 * Darf der Nutzer Einheiten in der Liste sehen?
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
 * Darf der Nutzer den KI-Lernpaket-Assistenten nutzen?
 * Nur Administrator und Fachschaftsleitung.
 */
export function kannKIAssistentNutzen(rolle) {
  return [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT].includes(rolle);
}

/**
 * Prüft Unit-Level-Berechtigungen für eine spezifische Einheit.
 * 
 * RBAC-Regeln für erweiterte Rechte in einer Einheit:
 * 1. Administrator: Immer volle Rechte
 * 2. Fachschaftsleitung: Volle Rechte im eigenen Fach
 * 3. Fachlehrkraft mit LEITUNG-Rolle in EinheitMembers: Volle Rechte für DIESE Einheit
 * 
 * @param {string} rolle - Globale Rolle des Nutzers
 * @param {string[]} benutzerFaecher - Fächer des Nutzers
 * @param {string} einheitFach - Fach der Einheit
 * @param {Array} einheitMembers - Array von EinheitMembers für diese Einheit
 * @param {string} currentUserEmail - Email des aktuellen Nutzers
 * @returns {object} { hasFullAccess: boolean, isAssignedMember: boolean, reason: string }
 */
export function hasUnitLevelAccess(rolle, benutzerFaecher, einheitFach, einheitMembers, currentUserEmail) {
  // 1. Administrator: immer volle Rechte
  if (rolle === ROLLEN.ADMIN) {
    return { hasFullAccess: true, isAssignedMember: false, reason: 'admin_global' };
  }

  // 2. Fachschaftsleitung im eigenen Fach: volle Rechte
  if (rolle === ROLLEN.FACHSCHAFT && Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach)) {
    return { hasFullAccess: true, isAssignedMember: false, reason: 'fachschaft_fach' };
  }

  // 3. Fachlehrkraft mit LEITUNG-Rolle in dieser Einheit: volle Rechte (Unit-Level FSL)
  const isAssignedMember = Array.isArray(einheitMembers) && 
    einheitMembers.some(m => m.user_email === currentUserEmail && m.unit_role === 'LEITUNG');
  
  if (isAssignedMember) {
    return { hasFullAccess: true, isAssignedMember: true, reason: 'unit_leitung' };
  }

  // Keine erweiterten Rechte
  return { hasFullAccess: false, isAssignedMember: false, reason: 'no_access' };
}

/**
 * Darf der Nutzer den freigabe_status einer Einheit ändern?
 * Nur Administrator und Fachschaftsleitung (im eigenen Fach).
 * (Unterschied zu kannInhaltFreigeben: das ist für Aktivitäten/Aufgaben)
 */
export function kannFreigabeStatusAendern(rolle, benutzerFaecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT) {
    return Array.isArray(benutzerFaecher) && benutzerFaecher.includes(einheitFach);
  }
  return false;
}

/**
 * Berechnet die vollständige Permissions-Map für eine Rolle.
 * Nützlich für UI-Entscheidungen.
 */
export function getPermissions(rolle, benutzerFaecher = []) {
   return {
     rolle,
     faecher: benutzerFaecher,
     istAdmin:                  rolle === ROLLEN.ADMIN,

     // ──────── BEREICH 1: STRUKTUR ────────────────────────────────────────
     kannStrukturBearbeiten:    (fach) => kannStrukturBearbeiten(rolle, benutzerFaecher, fach),
     kannEinheitVerwalten:      kannEinheitVerwalten(rolle),
     kannThemenfeldLoeschen:    (fach) => kannThemenfeldLoeschen(rolle, benutzerFaecher, fach),

     // ──────── BEREICH 2: INHALTE ────────────────────────────────────────
     kannInhalteBearbeiten:     (fach) => kannInhalteBearbeiten(rolle, benutzerFaecher, fach),
     kannInhaltFreigeben:       (fach) => kannInhaltFreigeben(rolle, benutzerFaecher, fach),
     kannEinheitBearbeiten:     (fach) => kannEinheitBearbeiten(rolle, benutzerFaecher, fach),

     // ──────── BEREICH 3: EXPORT ────────────────────────────────────────
     kannExportBedienen:        kannExportBedienen(rolle),
     kannExportLesen:           kannExportLesen(rolle),
     kannExportieren:           kannExportieren(rolle), // Legacy alias

     // ──────── ALLGEMEIN ────────────────────────────────────────
     kannSchreiben:             kannSchreiben(rolle),
     kannLoeschen:              [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT, ROLLEN.LEHRKRAFT].includes(rolle),
     kannBenutzerVerwalten:     rolle === ROLLEN.ADMIN,
     kannKIAssistentNutzen:     kannKIAssistentNutzen(rolle),
     kannFreigabeStatusAendern: (fach) => kannFreigabeStatusAendern(rolle, benutzerFaecher, fach),
     nurFreigegebene:           rolle === ROLLEN.MOODLE,
     istGast:                   [ROLLEN.BETRACHTER, ROLLEN.MOODLE].includes(rolle),
     wartungsmodus:             false, // wird von useRBAC überschrieben
   };
}