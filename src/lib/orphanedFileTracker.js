/**
 * orphanedFileTracker.js
 *
 * Frontend-Helfer zum Protokollieren verwaister Storage-Dateien.
 *
 * Hintergrund: Das Base44 SDK bietet aktuell keine Storage-Delete-API.
 * Wenn z.B. ein Bild im Editor ersetzt oder entfernt wird, bleibt die
 * alte Datei im Storage. Wir tragen sie in OrphanedFile ein, damit ein
 * zukünftiger Garbage-Collector-Job sie blind abarbeiten kann.
 *
 * Der Tracker ist "fire & forget" – Fehler werden geloggt, aber nicht geworfen.
 * Eine fehlgeschlagene Protokollierung darf NIEMALS einen UI-Flow blockieren.
 */

import { base44 } from '@/api/base44Client';

function isBase44StorageUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  const v = value.trim();
  if (v.startsWith('base44://')) return true;
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const lower = v.toLowerCase();
    return lower.includes('base44.app') || lower.includes('base44.com') || lower.includes('base44io');
  }
  return false;
}

/**
 * Eine einzelne URL als verwaist protokollieren.
 *
 * @param {Object} params
 * @param {string} params.fileUrl
 * @param {string} params.sourceEntity   – z.B. 'LernpaketPhaseAktivitaet'
 * @param {string} params.sourceRecordId
 * @param {string} [params.fieldName]
 * @param {string} [params.contextEinheitId]
 * @param {string} [params.contextLernpaketId]
 */
export async function trackOrphanedFile({
  fileUrl,
  sourceEntity,
  sourceRecordId,
  fieldName = null,
  contextEinheitId = null,
  contextLernpaketId = null,
}) {
  if (!isBase44StorageUrl(fileUrl)) return;
  if (!sourceEntity || !sourceRecordId) return;

  try {
    await base44.entities.OrphanedFile.create({
      file_url: fileUrl,
      source_entity: sourceEntity,
      source_record_id: sourceRecordId,
      field_name: fieldName,
      context_einheit_id: contextEinheitId,
      context_lernpaket_id: contextLernpaketId,
      deleted_at: new Date().toISOString(),
      status: 'pending',
    });
  } catch (err) {
    console.warn('[orphanedFileTracker] Konnte verwaiste Datei nicht protokollieren:', fileUrl, err?.message);
  }
}

/**
 * Mehrere URLs gleichzeitig protokollieren.
 */
export async function trackOrphanedFiles(records) {
  const filtered = (records || []).filter(r => isBase44StorageUrl(r?.fileUrl));
  if (filtered.length === 0) return;
  await Promise.all(filtered.map(r => trackOrphanedFile(r)));
}