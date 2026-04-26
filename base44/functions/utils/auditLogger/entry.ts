/**
 * auditLogger.js – Zentrale Audit-Trail-Funktion (Backend-Variante)
 *
 * Verantwortlich für das Logging aller Security-relevanten Operationen.
 *
 * Wichtig zur Semantik von „non-blocking":
 *   Wir fangen Fehler des Logging-Pfads ab, damit sie die Haupt-Operation
 *   NICHT abbrechen. Die Aufrufer nutzen jedoch typischerweise `await` –
 *   das bedeutet, der Audit-Write addiert Latenz zur Hauptoperation.
 *   Ein echter Fire-and-Forget („logAuditEvent(...)" ohne await) ist auf
 *   Deno Deploy / Serverless-Edge-Runtimes NICHT zuverlässig: sobald die
 *   Response zurückgegeben ist, wird der Isolate eingefroren – pendinge
 *   Promises sterben. Daher: lieber `await` und Latenz akzeptieren.
 *
 * Usage:
 *   import { logAuditEvent, logAuditEventsBatch } from './utils/auditLogger.js';
 *   await logAuditEvent(base44, {
 *     user: 'user@example.com',
 *     action: 'DELETE',
 *     resource: 'Einheiten',
 *     resourceId: 'uuid-123',
 *     changes: { fach: 'Deutsch', password: 'geheim' }, // → password wird zu '***'
 *     affectedCount: 5,
 *     status: 'success',
 *   });
 */

// ── Sanitizer ───────────────────────────────────────────────────────────
// Maskiert sensible Werte im `changes`-Objekt, ohne den Key zu entfernen.
// Forensik bleibt erhalten („Feld X wurde geändert"), der Wert ist `'***'`.
const SENSITIVE_KEY_PATTERN = /(password|passwort|token|secret|api[_-]?key|auth|credential|session)/i;

function sanitizeChanges(changes) {
  if (!changes || typeof changes !== 'object') return changes ?? null;
  if (Array.isArray(changes)) return changes;
  const out = {};
  for (const [key, value] of Object.entries(changes)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '***';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeChanges(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ── Validation ──────────────────────────────────────────────────────────
const ALLOWED_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'EXPORT'];
const ALLOWED_STATUS = ['success', 'failed'];

function buildAuditEntry(event) {
  if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
    return { ok: false, reason: 'incomplete' };
  }
  if (!ALLOWED_ACTIONS.includes(event.action)) {
    return { ok: false, reason: `invalid action: ${event.action}` };
  }
  if (!ALLOWED_STATUS.includes(event.status)) {
    return { ok: false, reason: `invalid status: ${event.status}` };
  }
  return {
    ok: true,
    entry: {
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: sanitizeChanges(event.changes) || null,
      affected_count: event.affectedCount || 1,
      status: event.status,
      error_message: event.errorMessage || null,
    },
  };
}

/**
 * Protokolliert eine einzelne Aktion im AuditLog.
 *
 * @param {object} base44 - Base44 SDK Client (mit asServiceRole)
 * @param {object} event  - Audit-Event (siehe Usage-Block oben)
 */
export async function logAuditEvent(base44, event) {
  try {
    const result = buildAuditEntry(event);
    if (!result.ok) {
      console.warn(`[AUDIT] skipping event (${result.reason}):`, event);
      return;
    }
    await base44.asServiceRole.entities.AuditLog.create(result.entry);

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
    console.error('[AUDIT_ERROR] Failed to log audit event:', error.message);
  }
}

/**
 * Batch-Logging für mehrere Events (z. B. Cascade Delete).
 *
 * Performance:
 *   Nutzt `bulkCreate(array)` – ein einziger Roundtrip zur DB statt N
 *   einzelner Inserts. Validierung & Sanitizing laufen lokal in JS.
 *
 * Fehlerhandling:
 *   Wirft NICHT (Audit darf Hauptoperation nie abbrechen). Bei DB-Fehler
 *   wird der gesamte Batch geloggt; bei Validierungsfehlern werden nur
 *   die ungültigen Events übersprungen.
 */
export async function logAuditEventsBatch(base44, events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const validEntries = [];
  let skipped = 0;
  for (const event of events) {
    const result = buildAuditEntry(event);
    if (result.ok) {
      validEntries.push(result.entry);
    } else {
      skipped += 1;
      console.warn(`[AUDIT] batch: skipping event (${result.reason})`);
    }
  }

  if (validEntries.length === 0) {
    if (skipped > 0) console.warn(`[AUDIT] batch: all ${skipped} events invalid`);
    return;
  }

  try {
    await base44.asServiceRole.entities.AuditLog.bulkCreate(validEntries);
    console.log(
      `[AUDIT] batch: wrote ${validEntries.length} entries${skipped ? `, skipped ${skipped}` : ''}`
    );
  } catch (error) {
    console.error(
      `[AUDIT_ERROR] Batch logging failed for ${validEntries.length} entries:`,
      error.message
    );
  }
}

/**
 * Retrieve audit history for a resource.
 * Limit ist Pflicht – sonst kann die Tabelle bei stark genutzten Resources
 * über die Zeit gigantisch werden und den Speicher fluten.
 */
export async function getAuditHistory(base44, resourceType, resourceId, limit = 200) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      { resource_type: resourceType, resource_id: resourceId },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('Failed to retrieve audit history:', error);
    return [];
  }
}

/**
 * Retrieve audit trail for a user (Security Reports).
 */
export async function getUserAuditTrail(base44, userEmail, limit = 50) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      { user_email: userEmail },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('Failed to retrieve user audit trail:', error);
    return [];
  }
}

/**
 * Find all failed operations (Security Audit).
 */
export async function getFailedOperations(base44, limit = 100) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      { status: 'failed' },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('Failed to retrieve failed operations:', error);
    return [];
  }
}