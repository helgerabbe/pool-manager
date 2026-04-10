/**
 * functionsHelper.js
 *
 * Zentraler Wrapper für alle Backend-Function-Aufrufe.
 * Einziger erlaubter Einstiegspunkt für base44.functions.invoke in der UI-Schicht.
 *
 * MIGRATIONSHINWEIS:
 * - Bei Supabase Edge Functions:
 *   const { data, error } = await supabase.functions.invoke(name, { body: payload });
 *   if (error) throw error;
 *   return { data };
 *
 * Der Rückgabe-Shape bleibt absichtlich identisch zum Axios-Response-Objekt
 * ({ data, status, headers }), damit alle Aufrufer unverändert bleiben.
 */

import { base44 } from '@/api/base44Client';

/**
 * Ruft eine Backend-Funktion auf.
 *
 * @param {string} name - Name der Backend-Funktion (camelCase)
 * @param {object} payload - Nutzlast (wird als Body gesendet)
 * @returns {Promise<{ data: any, status: number, headers: object }>}
 */
export async function invokeFunction(name, payload = {}) {
  return base44.functions.invoke(name, payload);
}