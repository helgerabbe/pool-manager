/**
 * FileService.js
 *
 * Abstraktionsschicht für alle Datei-Upload-Operationen.
 *
 * ⚠️ Phase 2 (2026-04-24): Diese Datei delegiert intern an `storageService`,
 * damit es nur noch EINEN zentralen Upload-Pfad in der App gibt. Die
 * öffentlichen Funktions-Signaturen und Rückgabewerte bleiben identisch,
 * sodass bestehende Komponenten (AufgabeCreateView, ProjektCreateView, …)
 * NICHT angefasst werden müssen.
 *
 * MIGRATIONSHINWEIS:
 * - `uploadFile(file)`        → Public Storage  (gibt { file_url } zurück)
 * - `uploadPrivateFile(file)` → Private Storage (gibt { file_uri } zurück)
 * - `createSignedUrl(uri)`    → temporär signierte URL für private Dateien
 *
 * Spätere Provider-Migration (z.B. Supabase) muss nur noch in
 * `services/storageService.js` erfolgen.
 */

import { base44 } from '@/api/base44Client';
import { storageService } from '@/services/storageService';

/**
 * Lädt eine Datei in den öffentlichen Storage hoch.
 *
 * @param {File} file
 * @returns {Promise<{ file_url: string }>}
 */
export async function uploadFile(file) {
  const result = await storageService.upload(file, false);
  // storageService gibt entweder einen String oder das Original-Objekt zurück.
  // Wir normalisieren das gewohnte Shape { file_url }.
  if (typeof result === 'string') return { file_url: result };
  if (result && typeof result === 'object' && 'file_url' in result) return result;
  // Fallback (sollte nicht passieren – defensiv für unerwartete Provider-Antworten)
  return { file_url: result };
}

/**
 * Lädt eine Datei in den privaten Storage hoch.
 *
 * @param {File} file
 * @returns {Promise<{ file_uri: string }>}
 */
export async function uploadPrivateFile(file) {
  const result = await storageService.upload(file, true);
  if (typeof result === 'string') return { file_uri: result };
  if (result && typeof result === 'object' && 'file_uri' in result) return result;
  return { file_uri: result };
}

/**
 * Erstellt eine zeitlich begrenzte signierte URL für eine private Datei.
 *
 * @param {string} fileUri
 * @param {number} expiresIn - Sekunden bis zum Ablauf (Standard: 300)
 * @returns {Promise<{ signed_url: string }>}
 */
export async function createSignedUrl(fileUri, expiresIn = 300) {
  return base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
}