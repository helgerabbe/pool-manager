/**
 * validationSchemas.js
 *
 * Phase 6.6: Zentrale Zod-basierte Validierungsschemata
 * 
 * Nutzt Zod für type-safe Schema-Definition mit aussagekräftigen Error-Messages.
 * Wird in react-hook-form via zodResolver integriert.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// ENUMS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────

const FAECHER = [
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
];

const JAHRGAENGE = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];

const FREIGABE_STATI = ['In Planung', 'Freigegeben für Moodle'];

const BAUSTEIN_TYPEN = [
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
];

const ANFORDERUNGSEBENEN = ['1 - Basis', '2 - Transfer', '3 - Projekt'];

// ─────────────────────────────────────────────────────────────────────────
// EINHEIT SCHEMA
// ─────────────────────────────────────────────────────────────────────────

export const EinheitSchema = z.object({
  titel_der_einheit: z
    .string()
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim(),
  
  fach: z
    .enum(FAECHER, {
      errorMap: () => ({ message: 'Bitte wählen Sie ein gültiges Fach aus' }),
    }),
  
  jahrgangsstufe: z
    .enum(JAHRGAENGE, {
      errorMap: () => ({ message: 'Bitte wählen Sie eine gültige Jahrgangsstufe aus' }),
    }),
  
  gesamtziel: z
    .string()
    .max(1000, 'Gesamtziel darf maximal 1000 Zeichen lang sein')
    .optional()
    .or(z.literal('')),
  
  freigabe_status: z
    .enum(FREIGABE_STATI)
    .default('In Planung'),
});

export const EinheitCreateSchema = EinheitSchema;
export const EinheitUpdateSchema = EinheitSchema.partial().extend({
  version: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────
// AUFGABE SCHEMA
// ─────────────────────────────────────────────────────────────────────────

export const AufgabeSchema = z.object({
  aufgabentext_inhalt: z
    .string()
    .min(5, 'Aufgabentext muss mindestens 5 Zeichen lang sein')
    .max(5000, 'Aufgabentext darf maximal 5000 Zeichen lang sein'),
  
  baustein_typ: z
    .enum(BAUSTEIN_TYPEN, {
      errorMap: () => ({ message: 'Bitte wählen Sie einen gültigen Baustein-Typ aus' }),
    }),
  
  lernpaket_id: z
    .string()
    .uuid('Ungültige Lernpaket-ID'),
  
  lernziel_id: z
    .string()
    .uuid('Ungültige Lernziel-ID')
    .optional()
    .or(z.literal('')),
  
  anforderungsebene: z
    .enum(ANFORDERUNGSEBENEN)
    .default('1 - Basis'),
  
  erwartungshorizont_ki_prompt: z
    .string()
    .max(2000, 'Erwartungshorizont darf maximal 2000 Zeichen lang sein')
    .optional()
    .or(z.literal('')),
  
  schwierigkeitsgrad: z
    .enum(['1-Stern', '2-Sterne', '3-Sterne'])
    .optional(),
});

export const AufgabeCreateSchema = AufgabeSchema;
export const AufgabeUpdateSchema = AufgabeSchema.partial();

// ─────────────────────────────────────────────────────────────────────────
// LERNPAKET SCHEMA
// ─────────────────────────────────────────────────────────────────────────

export const LernpaketSchema = z.object({
  titel_des_pakets: z
    .string()
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim(),
  
  einheit_id: z
    .string()
    .uuid('Ungültige Einheit-ID'),
  
  themenfeld_id: z
    .string()
    .uuid('Ungültige Themenfeld-ID')
    .optional()
    .or(z.literal('')),
  
  reihenfolge_nummer: z
    .number()
    .int('Reihenfolgenummer muss eine ganze Zahl sein')
    .min(1, 'Reihenfolgenummer muss mindestens 1 sein'),
  
  geschaetzte_dauer_minuten: z
    .number()
    .int('Dauer muss eine ganze Zahl sein')
    .min(1, 'Dauer muss mindestens 1 Minute sein')
    .optional(),
});

export const LernpaketCreateSchema = LernpaketSchema;
export const LernpaketUpdateSchema = LernpaketSchema.partial();

// ─────────────────────────────────────────────────────────────────────────
// HELPER: GET ENUM VALUES FOR DROPDOWNS
// ─────────────────────────────────────────────────────────────────────────

export const SchemaHelpers = {
  getFaecher: () => Array.from(FAECHER),
  getJahrgaenge: () => Array.from(JAHRGAENGE),
  getFreigabeStati: () => Array.from(FREIGABE_STATI),
  getBausteinTypen: () => Array.from(BAUSTEIN_TYPEN),
  getAnforderungsebenen: () => Array.from(ANFORDERUNGSEBENEN),
};

// ─────────────────────────────────────────────────────────────────────────
// EXPORT ALL SCHEMAS
// ─────────────────────────────────────────────────────────────────────────

export const schemas = {
  EinheitSchema,
  EinheitCreateSchema,
  EinheitUpdateSchema,
  AufgabeSchema,
  AufgabeCreateSchema,
  AufgabeUpdateSchema,
  LernpaketSchema,
  LernpaketCreateSchema,
  LernpaketUpdateSchema,
};

export default schemas;