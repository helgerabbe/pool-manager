/**
 * ✅ Rate-Limiter Modul für kritische Backend-Funktionen
 * 
 * Nutzt In-Memory-Tracking mit Timestamps
 * Format: { "email::function": [timestamp1, timestamp2, ...] }
 */

const requestLog = new Map();

/**
 * Prüft, ob Request das Rate-Limit überschreitet
 * @param {string} userEmail - E-Mail des Users
 * @param {string} functionName - Name der Funktion
 * @param {number} maxRequests - Max Requests im Zeitfenster
 * @param {number} windowMs - Zeitfenster in Millisekunden
 * @returns {boolean} true wenn Limit überschritten, false wenn OK
 */
export function isRateLimited(userEmail, functionName, maxRequests = 20, windowMs = 60000) {
  const key = `${userEmail}::${functionName}`;
  const now = Date.now();
  
  // Initalisiere oder hole bestehende Timestamps
  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }
  
  const timestamps = requestLog.get(key);
  
  // Entferne Timestamps außerhalb des Zeitfensters
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  requestLog.set(key, validTimestamps);
  
  // Prüfe Limit
  if (validTimestamps.length >= maxRequests) {
    return true; // Limit überschritten
  }
  
  // Registriere neuen Request
  validTimestamps.push(now);
  requestLog.set(key, validTimestamps);
  
  return false; // Limit nicht überschritten
}

/**
 * Cleanup alte Einträge (sollte periodisch aufgerufen werden)
 */
export function cleanupExpiredEntries(maxAge = 300000) {
  const now = Date.now();
  
  for (const [key, timestamps] of requestLog.entries()) {
    const valid = timestamps.filter(ts => now - ts < maxAge);
    
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}

/**
 * Setzt Log für einen User/Function zurück (für Testing/Admin)
 */
export function resetUserRateLimit(userEmail, functionName) {
  const key = `${userEmail}::${functionName}`;
  requestLog.delete(key);
}