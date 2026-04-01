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
 * Placeholder für weitere sichere Operationen
 * Diese werden in Phase 6.3 implementiert
 */
export async function createEinheit(data) {
  // Wird implementiert in Phase 6.3
  throw new Error('Not yet implemented');
}

export async function updateEinheit(einheitId, data) {
  // Wird implementiert in Phase 6.3
  throw new Error('Not yet implemented');
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