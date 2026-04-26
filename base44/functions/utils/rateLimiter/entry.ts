/**
 * rateLimiter.js — Sliding-Window-Log Rate-Limiter
 * ═══════════════════════════════════════════════════════════════════════
 *
 * @MIGRATION_BLOCKER: IN-MEMORY STATE
 * ─────────────────────────────────────────────────────────────────────
 * Diese Implementierung nutzt eine prozess-lokale `Map`. Sie funktioniert
 * NUR auf einem dauerhaft laufenden Single-Node-Backend zuverlässig.
 *
 * Für die geplante Supabase/Edge-Functions-Migration ist dieses Modul
 * ZWINGEND auszutauschen, weil:
 *   • Edge Functions sind stateless (Map ist nach Cold-Start leer).
 *   • Anfragen desselben Users können auf verschiedene Isolates routen –
 *     jede Instanz hätte ihre eigene, isolierte Map → Limit wirkungslos.
 *
 * Ziel-Architektur (Migrations-Logbuch §1):
 *   • Primär: Redis (z. B. Upstash, `@upstash/redis`) mit TTL pro Key.
 *   • Alternativ: Postgres-Tabelle + RPC-Funktion für niedrigen Traffic.
 *
 * Bis dahin: Diese Datei NICHT in horizontal skalierten Deployments
 * verwenden. Suche im Repo nach `@MIGRATION_BLOCKER`, um alle Stellen
 * zu finden, die beim Umzug angefasst werden müssen.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Format: requestLog: Map<"identifier::function", number[]>  (timestamps in ms, aufsteigend)
 */

const requestLog = new Map();

// Cleanup-Trigger: verhindert Memory-Leak durch Einmal-Nutzer.
// In Serverless-Umgebungen gibt es keine verlässlichen Hintergrundprozesse,
// also koppeln wir den Cleanup an Request-Zyklen + Map-Größe.
const CLEANUP_EVERY_N_REQUESTS = 500;
const CLEANUP_MAX_MAP_SIZE = 5000;
const DEFAULT_ENTRY_TTL_MS = 5 * 60 * 1000; // 5 Min – reicht für die längsten genutzten windowMs
let _requestCounter = 0;

/**
 * Prüft, ob ein Request das Rate-Limit überschreitet.
 *
 * @param {string} userIdentifier - Eindeutiger, **unveränderlicher** User-Identifier.
 *                                  Bevorzugt: user_id (UUID). E-Mail nur als
 *                                  Übergangs-Fallback (siehe Migrations-Logbuch §4).
 * @param {string} functionName   - Name der geschützten Funktion.
 * @param {number} maxRequests    - Max. Requests im Zeitfenster (Default 20).
 * @param {number} windowMs       - Zeitfenster in Millisekunden (Default 60_000).
 * @returns {boolean} true → Limit überschritten; false → Request erlaubt.
 */
export function isRateLimited(userIdentifier, functionName, maxRequests = 20, windowMs = 60000) {
  if (!userIdentifier) {
    // Defensive: ohne Identifier kann nicht limitiert werden – als Limit gewertet,
    // damit anonyme Aufrufer die Funktion nicht ungebremst hämmern.
    console.warn('[rateLimiter] called without userIdentifier – treating as limited');
    return true;
  }

  const key = `${userIdentifier}::${functionName}`;
  const now = Date.now();

  let timestamps = requestLog.get(key);
  if (!timestamps) {
    timestamps = [];
    requestLog.set(key, timestamps);
  }

  // ── Sliding-Window-Trim (in-place, O(k) statt O(n)) ─────────────────
  // Da Timestamps chronologisch eingefügt werden, stehen die ältesten
  // immer am Anfang. shift() bricht ab, sobald der erste gültige Wert
  // erreicht ist – kein neues Array, keine Kopie.
  while (timestamps.length > 0 && now - timestamps[0] >= windowMs) {
    timestamps.shift();
  }

  if (timestamps.length >= maxRequests) {
    _maybeRunCleanup();
    return true;
  }

  timestamps.push(now);
  _maybeRunCleanup();
  return false;
}

/**
 * Cleanup: entfernt alle Einträge, deren letzter Timestamp älter als `maxAge` ist.
 * Wird automatisch via `_maybeRunCleanup` getriggert – manueller Aufruf nur
 * für Tests / Admin-Tools nötig.
 */
export function cleanupExpiredEntries(maxAge = DEFAULT_ENTRY_TTL_MS) {
  const now = Date.now();
  let removed = 0;

  for (const [key, timestamps] of requestLog.entries()) {
    // Trim älteste am Anfang (in-place).
    while (timestamps.length > 0 && now - timestamps[0] >= maxAge) {
      timestamps.shift();
    }
    if (timestamps.length === 0) {
      requestLog.delete(key);
      removed += 1;
    }
  }

  if (removed > 0) {
    console.log(`[rateLimiter] cleanup removed ${removed} stale entries (${requestLog.size} active)`);
  }
}

/**
 * Setzt das Log für einen User/Function zurück (Testing / Admin-Override).
 */
export function resetUserRateLimit(userIdentifier, functionName) {
  const key = `${userIdentifier}::${functionName}`;
  requestLog.delete(key);
}

// ── Internals ──────────────────────────────────────────────────────────

/**
 * Triggert `cleanupExpiredEntries` gekoppelt an Request-Zyklen
 *   (alle N Requests) ODER beim Überschreiten einer Map-Größe.
 * So bleibt der Speicherverbrauch ohne setInterval beschränkt.
 */
function _maybeRunCleanup() {
  _requestCounter += 1;
  if (_requestCounter >= CLEANUP_EVERY_N_REQUESTS || requestLog.size >= CLEANUP_MAX_MAP_SIZE) {
    _requestCounter = 0;
    cleanupExpiredEntries();
  }
}