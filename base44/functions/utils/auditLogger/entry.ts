/**
 * auditLogger.js - Zentrale Audit Trail Funktion
 *
 * Verantwortlich für das Logging aller Security-relevanten Operationen.
 *
 * Fehlerverhalten: NON-THROWING.
 *   Logging-Fehler werden geschluckt und über console.error sichtbar gemacht,
 *   damit die aufrufende Haupt-Operation nicht abbricht.
 *
 *   ⚠️ Hinweis zur Latenz: Da Base44 Backend Functions auf Deno Deploy
 *   (Serverless Edge) laufen, MUSS der Aufrufer `await` verwenden — andernfalls
 *   wird die Isolate nach dem `Response`-Return ggf. terminiert, bevor der
 *   Audit-Insert in der DB ankommt. Echtes Fire-and-Forget ist hier also
 *   bewusst NICHT vorgesehen.
 *
 * DSGVO: Das `changes`-Objekt wird vor dem Persistieren durch
 *   `sanitizeChanges()` geleitet, um sensible Felder (password, token, …) zu
 *   maskieren. Siehe SENSITIVE_KEY_PATTERNS unten.
 *
 * Usage:
 *   import { logAuditEvent } from './utils/auditLogger.js';
 *   await logAuditEvent(base44, {
 *     user: 'user@example.com',
 *     action: 'DELETE',
 *     resource: 'Einheiten',
 *     resourceId: 'uuid-123',
 *     changes: { fach: 'Deutsch' },
 *     affectedCount: 5,
 *     status: 'success',
 *     ip: '192.168.1.1'
 *   });
 */

// ── DSGVO-Sanitizer ────────────────────────────────────────────────────────
// Schlüssel, die NIE im Klartext im Audit-Log landen dürfen. Match ist
// case-insensitive und als Substring (passwort, user_password, api_key,
// session_id … werden alle erkannt).
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwort',
  'token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'auth_header',
  'session',
  'cookie',
  'credit_card',
  'iban',
];

const REDACTED = '***REDACTED***';

function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

/**
 * Maskiert sensible Felder in einem Objekt rekursiv. Akzeptiert auch
 * verschachtelte Objekte (z. B. { user: { password: '...' } }) und Arrays.
 * Gibt einen FRISCHEN Klon zurück — das Original wird nicht mutiert.
 */
function sanitizeChanges(changes) {
  if (changes == null) return null;
  if (Array.isArray(changes)) return changes.map((v) => sanitizeChanges(v));
  if (typeof changes !== 'object') return changes;

  const out = {};
  for (const [key, value] of Object.entries(changes)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
    } else if (value && typeof value === 'object') {
      out[key] = sanitizeChanges(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Protokolliert eine Aktion im AuditLog
 * 
 * @param {object} base44 - Base44 SDK Client (with service role)
 * @param {object} event - Audit Event mit folgenden Properties:
 *   - user {string} - Email des Users
 *   - action {string} - "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "EXPORT"
 *   - resource {string} - Entity Type (z.B. "Einheiten")
 *   - resourceId {string} - ID der betroffenen Entity
 *   - changes {object} - Optional: Bei UPDATE die geänderten Felder
 *   - affectedCount {number} - Optional: Bei Cascade Delete die Anzahl gelöschter Records
 *   - status {string} - "success" | "failed"
 *   - errorMessage {string} - Optional: Fehlermeldung bei Status "failed"
 *   - ip {string} - Optional: Client IP Address
 */
export async function logAuditEvent(base44, event) {
  try {
    // Validierung
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      console.warn('Incomplete audit event, skipping:', event);
      return;
    }

    // Nur erlaubte Actions
    const allowedActions = ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'EXPORT'];
    if (!allowedActions.includes(event.action)) {
      console.warn(`Invalid action: ${event.action}`);
      return;
    }

    // Nur erlaubte Status
    const allowedStatus = ['success', 'failed'];
    if (!allowedStatus.includes(event.status)) {
      console.warn(`Invalid status: ${event.status}`);
      return;
    }

    // Create Audit Log Entry — sensible Felder werden vor dem Persistieren
    // maskiert (DSGVO).
    const auditEntry = {
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes ? sanitizeChanges(event.changes) : null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    };

    // Non-throwing, aber bewusst awaited — siehe Datei-Header (Deno Deploy).
    await base44.asServiceRole.entities.AuditLog.create(auditEntry);

    // Success logging
    if (event.status === 'success') {
      console.log(
        `[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId} (${event.affectedCount || 1} affected)`
      );
    } else {
      console.warn(
        `[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId} FAILED: ${event.errorMessage}`
      );
    }
  } catch (error) {
    // Kritisch: Fehler beim Logging dürfen nicht geworfen werden
    // Sie würden die Haupt-Operation blockieren
    console.error('[AUDIT_ERROR] Failed to log audit event:', error.message);
    console.error('[AUDIT_ERROR] Event was:', event);
    // Nichts werfen - Operation muss weitergehen
  }
}

/**
 * Schnelle Batch-Logging für mehrere Events.
 * Nützlich für Cascade Deletes mit vielen Entities.
 *
 * Hinweis: `logAuditEvent` ist non-throwing (siehe oben). `Promise.allSettled`
 * liefert daher in der Praxis nur 'fulfilled'-Ergebnisse — wir werten den
 * Status trotzdem aus (Defense in Depth, falls die innere Signatur jemals
 * geändert wird) und reporten rejected-Fälle.
 *
 * TODO (perf): Auf `base44.asServiceRole.entities.AuditLog.bulkCreate(array)`
 * umstellen, sobald die Semantik (alles-oder-nichts vs. einzeln) im Team
 * geklärt ist. Aktuell N einzelne Inserts pro Batch.
 */
export async function logAuditEventsBatch(base44, events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const results = await Promise.allSettled(
    events.map((event) => logAuditEvent(base44, event))
  );

  const rejected = results.filter((r) => r.status === 'rejected');
  if (rejected.length > 0) {
    console.error(
      `[AUDIT_ERROR] Batch logging: ${rejected.length}/${events.length} events failed.`
    );
    rejected.forEach((r, i) => {
      console.error(`[AUDIT_ERROR] Rejected #${i}:`, r.reason);
    });
  }
}

/**
 * Hilfs-Funktion: Findet Audit Logs für eine bestimmte Resource
 * (Für Admin Reports / Compliance).
 *
 * Default-Limit verhindert OOM bei stark frequentierten Ressourcen — Aufrufer,
 * die wirklich vollständige Historien brauchen, können explizit höher gehen
 * oder über mehrere Aufrufe paginieren (sort: '-created_date').
 */
export async function getAuditHistory(base44, resourceType, resourceId, limit = 200) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      {
        resource_type: resourceType,
        resource_id: resourceId,
      },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('Failed to retrieve audit history:', error);
    return [];
  }
}

/**
 * Hilfs-Funktion: Findet alle Audit Logs für einen bestimmten User
 * (Für Security Reports)
 */
export async function getUserAuditTrail(base44, userEmail, limit = 50) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      user_email: userEmail,
    }, '-created_date', limit);
  } catch (error) {
    console.error('Failed to retrieve user audit trail:', error);
    return [];
  }
}

/**
 * Hilfs-Funktion: Findet alle failed Operations (Security Audit)
 */
export async function getFailedOperations(base44, limit = 100) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      status: 'failed',
    }, '-created_date', limit);
  } catch (error) {
    console.error('Failed to retrieve failed operations:', error);
    return [];
  }
}