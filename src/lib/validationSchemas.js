/**
 * validationSchemas.js
 *
 * Phase 6.6: Frontend & Backend Validierungsschemata
 *
 * Definiert Pflichtfelder und Validierungsregeln für Entities.
 * Kann sowohl im Frontend (vor API-Call) als auch im Backend (nach API-Call) verwendet werden.
 */

// ── Einfache Validierungs-Helper ─────────────────────────────────────────────

/**
 * Validiert ein erforderliches Textfeld.
 * @param {string} value - Zu validierender Wert
 * @param {string} fieldName - Name des Feldes (für Fehlermeldung)
 * @returns {{valid: boolean, error?: string}}
 */
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return {
      valid: false,
      error: `${fieldName} ist erforderlich`,
    };
  }
  return { valid: true };
}

/**
 * Validiert, dass ein Wert in einer Liste erlaubter Werte liegt.
 * @param {string} value - Zu validierender Wert
 * @param {Array} allowedValues - Liste erlaubter Werte
 * @param {string} fieldName - Name des Feldes
 * @returns {{valid: boolean, error?: string}}
 */
export function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} muss einer der folgenden Werte sein: ${allowedValues.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validiert eine numerische Mindestlänge.
 * @param {string} value - Zu validierender Wert
 * @param {number} minLength - Minimale Länge
 * @param {string} fieldName - Name des Feldes
 * @returns {{valid: boolean, error?: string}}
 */
export function validateMinLength(value, minLength, fieldName) {
  if (value && value.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} muss mindestens ${minLength} Zeichen lang sein`,
    };
  }
  return { valid: true };
}

// ── Entity-spezifische Validierungsschemata ──────────────────────────────────

/**
 * Validierungsschema für Einheiten (Create/Update)
 *
 * Pflichtfelder:
 * - titel_der_einheit (string, minLength: 3)
 * - fach (enum)
 * - jahrgangsstufe (enum)
 *
 * Optionale Felder:
 * - gesamtziel (string, nullable)
 * - freigabe_status (enum, default: "In Planung")
 */
export const EINHEIT_SCHEMA = {
  titel_der_einheit: {
    required: true,
    type: 'string',
    minLength: 3,
    errorMessage: 'Titel der Einheit ist erforderlich (mindestens 3 Zeichen)',
  },
  fach: {
    required: true,
    type: 'enum',
    allowedValues: [
      'Deutsch',
      'Mathematik',
      'Englisch',
      'Französisch',
      'Latein',
      'Biologie',
      'Chemie',
      'Physik',
      'Geschichte',
      'Geographie',
      'Politik',
      'Wirtschaft',
      'Kunst',
      'Musik',
      'Sport',
      'Religion',
      'Ethik',
      'Informatik',
    ],
    errorMessage: 'Fach ist erforderlich und muss gültig sein',
  },
  jahrgangsstufe: {
    required: true,
    type: 'enum',
    allowedValues: ['5', '6', '7', '8', '9', '10', '11', '12', '13'],
    errorMessage: 'Jahrgangsstufe ist erforderlich',
  },
  gesamtziel: {
    required: false,
    type: 'string',
    nullable: true,
  },
  freigabe_status: {
    required: false,
    type: 'enum',
    allowedValues: ['In Planung', 'Freigegeben für Moodle'],
    default: 'In Planung',
  },
};

/**
 * Validierungsschema für Lernpakete
 */
export const LERNPAKET_SCHEMA = {
  titel_des_pakets: {
    required: true,
    type: 'string',
    minLength: 3,
    errorMessage: 'Titel des Lernpakets ist erforderlich (mindestens 3 Zeichen)',
  },
  einheit_id: {
    required: true,
    type: 'string',
    errorMessage: 'Einheit ist erforderlich',
  },
  themenfeld_id: {
    required: false,
    type: 'string',
    nullable: true,
  },
  reihenfolge_nummer: {
    required: true,
    type: 'number',
    errorMessage: 'Reihenfolgenummer ist erforderlich',
  },
  geschaetzte_dauer_minuten: {
    required: false,
    type: 'number',
    nullable: true,
  },
};

/**
 * Validierungsschema für Aufgabenbausteine
 */
export const AUFGABE_SCHEMA = {
  baustein_typ: {
    required: true,
    type: 'enum',
    allowedValues: [
      'Pre-Test',
      'Input',
      'Ebene-1-Übung',
      'Ebene-2-Aufgabe',
      'Ebene-3-Projekt',
      'Exit-Check',
      'Prüfung Typ A',
      'Prüfung Typ B',
      'Prüfung Typ C',
      'Input/Erklärung',
      'Infoseite/Cheat-Sheet',
      'Musterlösung',
      'Übungsaufgaben',
      'Fakten-Input',
      'Drill-Übung',
    ],
    errorMessage: 'Baustein-Typ ist erforderlich und muss gültig sein',
  },
  aufgabentext_inhalt: {
    required: true,
    type: 'string',
    minLength: 5,
    errorMessage: 'Aufgabentext ist erforderlich (mindestens 5 Zeichen)',
  },
  lernpaket_id: {
    required: true,
    type: 'string',
    errorMessage: 'Lernpaket ist erforderlich',
  },
  lernziel_id: {
    required: false,
    type: 'string',
    nullable: true,
  },
};

// ── Zod-Schema: MatchTerms ───────────────────────────────────────────────────

import { z } from 'zod';

/**
 * Zod-Schema für "Begriffe zuordnen"-Aufgaben.
 * Felder: instruction, pairs (min. 2), distractors (optional)
 */
export const MatchTermsSchema = z.object({
  instruction: z.string().min(1, 'Arbeitsanweisung ist erforderlich'),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1, 'Begriff darf nicht leer sein'),
        right: z.string().min(1, 'Zuordnung darf nicht leer sein'),
      })
    )
    .min(2, 'Mindestens 2 Begriffspaare sind erforderlich'),
  distractors: z.array(z.string().min(1)).optional().default([]),
});

/**
 * Validiert ein Objekt gegen ein Schema.
 *
 * @param {Object} data - Zu validierendes Objekt
 * @param {Object} schema - Validierungsschema
 * @returns {{valid: boolean, errors: {[fieldName]: string}}}
 *
 * @example
 * const result = validateEntity({ titel_der_einheit: '', fach: 'Mathematik' }, EINHEIT_SCHEMA);
 * if (!result.valid) {
 *   console.log(result.errors); // { titel_der_einheit: "Titel der Einheit ist erforderlich..." }
 * }
 */
export function validateEntity(data, schema) {
  const errors = {};

  Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
    const value = data[fieldName];

    // Pflichtfeld-Check
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors[fieldName] = fieldSchema.errorMessage || `${fieldName} ist erforderlich`;
      return;
    }

    // Wenn optional und leer: Skip weitere Validierung
    if (!fieldSchema.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Längen-Check (für Strings)
    if (fieldSchema.minLength && typeof value === 'string') {
      const result = validateMinLength(value, fieldSchema.minLength, fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        return;
      }
    }

    // Enum-Check
    if (fieldSchema.type === 'enum' && fieldSchema.allowedValues) {
      const result = validateEnum(value, fieldSchema.allowedValues, fieldName);
      if (!result.valid) {
        errors[fieldName] = result.error;
        return;
      }
    }

    // Typ-Check
    if (fieldSchema.type && value !== null && value !== undefined) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedType = fieldSchema.type === 'enum' ? 'string' : fieldSchema.type;

      if (actualType !== expectedType && fieldSchema.type !== 'enum') {
        errors[fieldName] = `${fieldName} muss vom Typ ${expectedType} sein`;
        return;
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}