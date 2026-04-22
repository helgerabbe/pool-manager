/**
 * lib/errorMapper.js
 * 
 * "Das Sprachrohr": Strukturiertes Error-Mapping für benutzerfreundliche Fehlermeldungen
 */

const ERROR_MESSAGES = {
  '409': 'Konflikt: Jemand anderes bearbeitet dies gerade. Bitte aktualisiere die Seite.',
  '403': 'Fehlende Rechte: Dein Zugriff wurde verweigert.',
  '404': 'Nicht gefunden: Die angeforderte Ressource existiert nicht.',
  '500': 'Server-Fehler: Bitte versuche es später erneut.',
  'NETWORK_ERROR': 'Verbindung verloren: Bitte prüfe dein Internet.',
  'VALIDATION_FAILED': 'Eingabe ungültig: Bitte prüfe die Pflichtfelder.',
  'LOCK_EXPIRED': 'Sitzung abgelaufen: Bitte lade die Seite neu.',
  'EXPORT_LOCKED': 'Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuche es später.',
};

/**
 * Maps an error object to a user-friendly message
 * @param {Error|Object} error - Error object from API or mutation
 * @returns {string} - User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return ERROR_MESSAGES['VALIDATION_FAILED'];

  // Axios response errors
  const status = error?.response?.status;
  const responseMsg = error?.response?.data?.message || '';

  // Check for specific HTTP status
  if (ERROR_MESSAGES[String(status)]) {
    return ERROR_MESSAGES[String(status)];
  }

  // Check for export lock in message
  if (responseMsg.includes('export') || responseMsg.includes('locked')) {
    return ERROR_MESSAGES['EXPORT_LOCKED'];
  }

  // Check for lock-related errors
  if (
    responseMsg.toLowerCase().includes('lock') ||
    error?.message?.toLowerCase().includes('lock')
  ) {
    return ERROR_MESSAGES['LOCK_EXPIRED'];
  }

  // Check for validation errors
  if (
    responseMsg.toLowerCase().includes('required') ||
    responseMsg.toLowerCase().includes('invalid')
  ) {
    return ERROR_MESSAGES['VALIDATION_FAILED'];
  }

  // Check for network errors
  if (!window.navigator.onLine) {
    return ERROR_MESSAGES['NETWORK_ERROR'];
  }

  // Fallback to original message or default
  if (responseMsg) {
    return responseMsg;
  }

  if (error?.message) {
    return error.message;
  }

  return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
}

/**
 * Determines error severity for styling
 * @param {number} status - HTTP status code
 * @returns {string} - 'critical' | 'warning' | 'info'
 */
export function getErrorSeverity(status) {
  if (status >= 500) return 'critical';
  if (status >= 400) return 'warning';
  return 'info';
}