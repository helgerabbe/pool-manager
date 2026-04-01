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
  constructor(status, message) {
    super(message);
    this.name = 'SecureApiError';
    this.status = status;
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
 * @param {Object} data - { titel_der_einheit?, gesamtziel?, fach?, jahrgangsstufe?, freigabe_status? }
 * @returns {Promise<{success: boolean, data: Object}>}
 * @throws {SecureApiError} Bei Fehler (403 Forbidden, 404 Not Found, etc.)
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

    throw new SecureApiError(status, message);
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
 * Alle Funktionen als Objekt exportieren (alternative API)
 */
export const secureApi = {
  deleteEinheit,
  createEinheit,
  updateEinheit,
};

export default secureApi;