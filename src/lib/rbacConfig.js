/**
 * rbacConfig.js - Single Source of Truth für RBAC
 *
 * Zentrale Definition aller Rollen und Berechtigungs-Matrizen.
 * Wird von Frontend (lib/rbac.js) und Backend (lib/rbacEvaluator.js) importiert.
 */

export const ROLLEN = {
  ADMIN: 'Administrator',
  FACHSCHAFT: 'Fachschaftsleitung',
  LEHRKRAFT: 'Fachlehrkraft',
  BETRACHTER: 'Betrachter',
  MOODLE: 'Moodle-Designer',
};

export const RBAC_MATRIX = {
  [ROLLEN.ADMIN]: {
    allowAll: true,
  },
  [ROLLEN.FACHSCHAFT]: {
    operations: {
      CREATE: ['Einheiten', 'Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe', 'Basismodule'],
      UPDATE: ['Einheiten', 'Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe', 'Basismodule'],
      DELETE: ['Einheiten', 'Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe', 'Basismodule'],
      PUBLISH: ['Einheiten', 'Basismodule'],
    },
    condition: 'mustOwnSubject',
  },
  [ROLLEN.LEHRKRAFT]: {
    operations: {
      CREATE: ['Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe'],
      UPDATE: ['Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe'],
      DELETE: ['Themenfeld', 'Lernpakete', 'Lernziele', 'Aufgabenbausteine', 'AllgemeineAufgabe'],
    },
    condition: 'mustBeUnitLead',
  },
  [ROLLEN.BETRACHTER]: {
    operations: {},
    allowedReadOnly: true,
  },
  [ROLLEN.MOODLE]: {
    operations: {
      UPDATE: ['Einheiten', 'Lernpakete'],
    },
    allowedReadOnly: true,
  },
};