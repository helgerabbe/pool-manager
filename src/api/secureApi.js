/**
 * secureApi.js
 * 
 * Frontend Adapter für sichere Backend API Calls via Base44 SDK
 * Wrapping der deleteEinheitSecure, createEinheitSecure etc. Functions
 * 
 * Usage:
 *   import { secureApi } from '@/api/secureApi';
 *   await secureApi.deleteEinheit(einheitId);
 */

import { base44 } from '@/api/base44Client';
import { validateEntity, EINHEIT_SCHEMA, LERNPAKET_SCHEMA, AUFGABE_SCHEMA } from '@/lib/validationSchemas';
import { isValidTransition } from '@/lib/stateMachine';

/**
 * Custom error class für besseres Error Handling
 */
export class SecureApiError extends Error {
  constructor(status, message, additionalData = {}) {
    super(message);
    this.name = 'SecureApiError';
    this.status = status;
    this.additionalData = additionalData;
  }

  isForbidden() {
    return this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }

  isUnauthorized() {
    return this.status === 401;
  }

  isConflict() {
    return this.status === 409;
  }
}

/**
 * Sichere Einheit Delete Operation via Base44 SDK
 * 
 * @param {string} einheitId - Die ID der zu löschenden Einheit
 * @returns {Promise<{success: boolean, deleted_count: number}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 404 Not Found, etc.)
 * 
 * @example
 * try {
 *   const result = await secureApi.deleteEinheit('uuid-123');
 *   console.log(`Deleted ${result.deleted_count} records`);
 * } catch (error) {
 *   if (error.isForbidden()) {
 *     // User hat keine Berechtigung
 *     console.error('Keine Berechtigung zum Löschen:', error.message);
 *   } else {
 *     // Anderer Fehler
 *     console.error(error.message);
 *   }
 * }
 */
export async function deleteEinheit(einheitId) {
  if (!einheitId) {
    throw new Error('einheitId is required');
  }

  try {
    const response = await base44.functions.invoke('deleteEinheitSecure', {
      einheit_id: einheitId,
    });
    return response.data;
  } catch (error) {
    // Parse error response from backend function
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Sichere Einheit Create Operation via Base44 SDK
 * 
 * @param {Object} data - { titel_der_einheit, fach, jahrgangsstufe, gesamtziel?, freigabe_status? }
 * @returns {Promise<{success: boolean, data: Object}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 400 Validation, etc.)
 */
export async function createEinheit(data) {
  // Frontend-Validierung vor API-Call
  const validation = validateEntity(data, EINHEIT_SCHEMA);
  if (!validation.valid) {
    const error = new SecureApiError(400, 'Validierungsfehler');
    error.validationErrors = validation.errors;
    throw error;
  }

  try {
    const response = await base44.functions.invoke('createEinheitSecure', data);
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Sichere Einheit Update Operation via Base44 SDK
 * 
 * @param {string} einheitId - Die ID der zu aktualisierenden Einheit
 * @param {Object} data - { titel_der_einheit?, gesamtziel?, fach?, jahrgangsstufe?, freigabe_status?, version? }
 * @returns {Promise<{success: boolean, data: Object}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 404 Not Found, 409 Conflict, etc.)
 */
export async function updateEinheit(einheitId, data, currentEinheit = null) {
  if (!einheitId) {
    throw new Error('einheitId is required');
  }

  // Validiere nur die Felder, die updated werden
  const schema = Object.keys(data).reduce((acc, key) => {
    if (EINHEIT_SCHEMA[key]) {
      acc[key] = EINHEIT_SCHEMA[key];
    }
    return acc;
  }, {});

  if (Object.keys(schema).length > 0) {
    const validation = validateEntity(data, schema);
    if (!validation.valid) {
      const error = new SecureApiError(400, 'Validierungsfehler');
      error.validationErrors = validation.errors;
      throw error;
    }
  }

  // State Machine: Prüfe ob Status-Übergang erlaubt ist
  if (data.freigabe_status && currentEinheit?.freigabe_status) {
    if (!isValidTransition(currentEinheit.freigabe_status, data.freigabe_status)) {
      const error = new SecureApiError(
        400,
        `Ungültiger Status-Übergang: "${currentEinheit.freigabe_status}" → "${data.freigabe_status}"`
      );
      throw error;
    }
  }

  try {
    const response = await base44.functions.invoke('updateEinheitSecure', {
      einheit_id: einheitId,
      ...data,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    // Extrahiere zusätzliche Daten für 409 Conflicts
    const additionalData = {
      current_version: errorData.current_version,
      provided_version: errorData.provided_version,
    };

    throw new SecureApiError(status, message, additionalData);
  }
}

/**
 * Sichere Einheit Publish Operation (Status-Änderung) via Base44 SDK
 * 
 * @param {string} einheitId - Die ID der zu publishenden Einheit
 * @param {string} targetStatus - Ziel-Status (z.B. "Freigegeben für Moodle")
 * @returns {Promise<{success: boolean, data: Object}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 404 Not Found, etc.)
 */
export async function publishEinheit(einheitId, targetStatus = 'Freigegeben für Moodle') {
  if (!einheitId) {
    throw new Error('einheitId is required');
  }

  try {
    const response = await base44.functions.invoke('publishEinheitSecure', {
      id: einheitId,
      status: targetStatus,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Phase 6.5: Aggregations-Endpoint für Workspace-Daten (löst N+1 Problem)
 *
 * @param {string} einheitId - Die ID der Einheit
 * @returns {Promise<{success: boolean, data: {einheit, themenfelder, _flat}}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 404 Not Found, etc.)
 *
 * @example
 * const { data } = await secureApi.getWorkspaceData('einheit-123');
 * // Rückgabe: hierarchische Struktur mit Themenfeldern → Lernpakete → Lernziele → Aufgaben
 * data.themenfelder.forEach(tf => {
 *   tf.lernpakete.forEach(paket => {
 *     paket.lernziele.forEach(ziel => {
 *       ziel.aufgaben.forEach(aufgabe => { ... });
 *     });
 *   });
 * });
 *
 * // Flat lookup tables für schnelle Lookups
 * const paket = data._flat.lernpakete.find(p => p.id === 'id-123');
 */
export async function getWorkspaceData(einheitId) {
  if (!einheitId) {
    throw new Error('einheitId is required');
  }

  try {
    const response = await base44.functions.invoke(
      'getWorkspaceEinheitDataSecure',
      { einheit_id: einheitId }
    );
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Phase 6.5: Paginierter Einheiten-List-Endpoint
 *
 * @param {number} page - Seitennummer (Standard: 1)
 * @param {number} limit - Einträge pro Seite (Standard: 15, Max: 100)
 * @returns {Promise<{success: boolean, data: Array, meta: {total_count, current_page, total_pages, page_size}}>}
 * @throws {SecureApiError} Bei Fehler
 *
 * @example
 * const result = await secureApi.getEinheitenList(1, 15);
 * // result.data: Array von Einheiten (max 15 pro Seite)
 * // result.meta.total_pages: Gesamtzahl Seiten für Pagination
 */
export async function getEinheitenList(page = 1, limit = 15) {
  if (page < 1) {
    throw new Error('page must be >= 1');
  }
  if (limit < 1 || limit > 100) {
    throw new Error('limit must be between 1 and 100');
  }

  try {
    const response = await base44.functions.invoke('getEinheitenListSecure', {
      page,
      limit,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Alle Funktionen als Objekt exportieren (alternative API)
 */
/**
 * Bulk-Aufgaben-Generator: Erzeugt KI-basierte Varianten einer Master-Aufgabe
 * 
 * @param {Object} payload - { master_aufgabe_text, loesung_text, lernziel?, fach, jahrgangsstufe, anzahl }
 * @returns {Promise<{success: boolean, generated_tasks: Array, metadata: Object}>}
 * @throws {SecureApiError} Bei Fehler (400 Bad Request, 500 LLM Error, etc.)
 */
export async function generateBulkAufgaben(payload) {
  if (!payload?.master_aufgabe_text || !payload?.loesung_text || !payload?.fach || !payload?.jahrgangsstufe || !payload?.anzahl) {
    throw new Error('Missing required fields for bulk generation');
  }

  if (payload.anzahl < 1 || payload.anzahl > 20) {
    throw new Error('Anzahl muss zwischen 1 und 20 liegen');
  }

  try {
    const response = await base44.functions.invoke('generateBulkAufgabenSecure', payload);
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Bulk-Aufgaben-Generator für Ebene 2 (Transfer/Anwendungsaufgaben)
 * 
 * @param {Object} payload - { master_aufgabe_text, loesung_text, themenfeld?, kompetenzen?, schwierigkeitsgrad?, fach, jahrgangsstufe, anzahl }
 * @returns {Promise<{success: boolean, generated_tasks: Array, metadata: Object}>}
 * @throws {SecureApiError} Bei Fehler (400 Bad Request, 500 LLM Error, etc.)
 */
export async function generateBulkEbene2(payload) {
  if (!payload?.master_aufgabe_text || !payload?.loesung_text || !payload?.fach || !payload?.jahrgangsstufe || !payload?.anzahl) {
    throw new Error('Missing required fields for bulk generation');
  }

  if (payload.anzahl < 1 || payload.anzahl > 20) {
    throw new Error('Anzahl muss zwischen 1 und 20 liegen');
  }

  try {
    const response = await base44.functions.invoke('generateBulkEbene2Secure', payload);
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

/**
 * Batch-Create für multiple Aufgaben
 * 
 * @param {Array} aufgaben - Array von Aufgaben-Objekten
 * @returns {Promise<{success: boolean, created_count: number}>}
 */
export async function createBulkAufgaben(aufgaben) {
  if (!Array.isArray(aufgaben) || aufgaben.length === 0) {
    throw new Error('Aufgaben array muss nicht-leer sein');
  }

  try {
    const results = await Promise.all(
      aufgaben.map((aufgabe) => base44.entities.Aufgabenbausteine.create(aufgabe))
    );
    return { success: true, created_count: results.length };
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.message || 'Bulk create failed';

    throw new SecureApiError(status, message);
  }
}

/**
 * Replikation: Generiere Varianten einer Masteraufgabe
 * 
 * @param {string} masterId - ID der Masteraufgabe
 * @param {number} anzahl - Anzahl der zu generierenden Varianten (1-20)
 * @returns {Promise<{success: boolean, replicas: Array, metadata: Object}>}
 */
export async function generateReplicas(masterId, anzahl = 5, zusatzHinweise = '') {
  if (!masterId) {
    throw new Error('masterId is required');
  }

  if (anzahl < 1 || anzahl > 20) {
    throw new Error('Anzahl muss zwischen 1 und 20 liegen');
  }

  try {
    const response = await base44.functions.invoke('generateReplicasSecure', {
      master_id: masterId,
      anzahl,
      zusatz_hinweise: zusatzHinweise,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};
    const message = errorData.error || error.message || 'Unknown error';

    throw new SecureApiError(status, message);
  }
}

export const secureApi = {
  deleteEinheit,
  createEinheit,
  updateEinheit,
  publishEinheit,
  getWorkspaceData,
  getEinheitenList,
  generateBulkAufgaben,
  generateBulkEbene2,
  createBulkAufgaben,
  generateReplicas,
};

export default secureApi;