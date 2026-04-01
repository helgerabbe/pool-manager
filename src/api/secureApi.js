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
  if (!data?.titel_der_einheit?.trim() || !data?.fach || !data?.jahrgangsstufe) {
    throw new Error('Missing required fields: titel_der_einheit, fach, jahrgangsstufe');
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
export async function updateEinheit(einheitId, data) {
  if (!einheitId) {
    throw new Error('einheitId is required');
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
export const secureApi = {
  deleteEinheit,
  createEinheit,
  updateEinheit,
  publishEinheit,
  getWorkspaceData,
  getEinheitenList,
};

export default secureApi;