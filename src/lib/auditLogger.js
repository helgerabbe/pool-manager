/**
 * auditLogger.js – Zentrale Audit-Trail-Funktion (Frontend-Variante)
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
 */

// ── Sanitizer ───────────────────────────────────────────────────────────
// Maskiert sensible Werte im `changes`-Objekt, ohne den Key zu entfernen.
// Forensik bleibt erhalten („Feld X wurde geändert"), der Wert ist `'***'`.
const SENSITIVE_KEY_PATTERN = /(password|passwort|token|secret|api[_-]?key|auth|credential|session)/i;

function sanitizeChanges(changes) {
  if (!changes || typeof changes !== 'object') return changes ?? null;
  if (Array.isArray(changes)) return changes; // Arrays (z. B. changed_fields) unverändert
  const out = {};
  for (const [key, value] of Object.entries(changes)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '***';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeChanges(value); // rekursiv
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
 * @param {object} event  - Audit-Event
 *   - user, action, resource, resourceId, status (Pflicht)
 *   - changes, affectedCount, errorMessage (optional)
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
      console.log(`[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId}`);
    } else {
      console.warn(
        `[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId} FAILED: ${event.errorMessage}`
      );
    }
  } catch (error) {
    // Fehler beim Logging dürfen die Hauptoperation nicht abbrechen.
    console.error('[AUDIT_ERROR]', error.message);
  }
}

/**
 * Retrieve audit history for a resource.
 * Limit ist Pflicht – ohne ihn kann die Tabelle bei stark genutzten Resources
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
    console.error('Audit history error:', error);
    return [];
  }
}

/**
 * Retrieve audit trail for a user.
 */
export async function getUserAuditTrail(base44, userEmail, limit = 50) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      { user_email: userEmail },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('User audit trail error:', error);
    return [];
  }
}

/**
 * Find all failed operations.
 */
export async function getFailedOperations(base44, limit = 100) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter(
      { status: 'failed' },
      '-created_date',
      limit
    );
  } catch (error) {
    console.error('Failed operations error:', error);
    return [];
  }
}