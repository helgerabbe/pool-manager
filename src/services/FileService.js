/**
 * FileService.js
 *
 * Abstraktionsschicht für alle Datei-Upload-Operationen.
 * Einzige Datei, die base44.integrations.Core.UploadFile aufrufen darf.
 *
 * MIGRATIONSHINWEIS:
 * - `uploadFile(file)` → supabase.storage.from('bucket').upload(path, file)
 *   Rückgabe-Shape bleibt identisch: { file_url: string }
 *   Supabase-Äquivalent:
 *     const { data, error } = await supabase.storage.from('uploads').upload(path, file);
 *     const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path);
 *     return { file_url: publicUrl };
 *
 * - `uploadPrivateFile(file)` → supabase.storage.from('private-bucket').upload(path, file)
 *   Rückgabe: { file_uri: string } (signierte URL über separaten Call generieren)
 */

import { base44 } from '@/api/base44Client';

/**
 * Lädt eine Datei hoch und gibt die öffentliche URL zurück.
 *
 * @param {File} file - Das hochzuladende File-Objekt
 * @returns {Promise<{ file_url: string }>}
 */
export async function uploadFile(file) {
  return base44.integrations.Core.UploadFile({ file });
}

/**
 * Lädt eine Datei in den privaten Storage hoch.
 * Gibt eine nicht-öffentliche URI zurück (für signierte URLs via createSignedUrl).
 *
 * @param {File} file - Das hochzuladende File-Objekt
 * @returns {Promise<{ file_uri: string }>}
 */
export async function uploadPrivateFile(file) {
  return base44.integrations.Core.UploadPrivateFile({ file });
}

/**
 * Erstellt eine zeitlich begrenzte signierte URL für eine private Datei.
 *
 * @param {string} fileUri - URI aus uploadPrivateFile
 * @param {number} expiresIn - Sekunden bis zum Ablauf (Standard: 300)
 * @returns {Promise<{ signed_url: string }>}
 */
export async function createSignedUrl(fileUri, expiresIn = 300) {
  return base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
}