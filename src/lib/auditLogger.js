/**
 * auditLogger.js - Zentrale Audit Trail Funktion
 * 
 * Verantwortlich für das Logging aller Security-relevanten Operationen.
 * Fehler beim Logging blockieren niemals die Haupt-Operation (non-blocking).
 */

/**
 * Protokolliert eine Aktion im AuditLog
 * 
 * @param {object} base44 - Base44 SDK Client (with service role)
 * @param {object} event - Audit Event mit Properties:
 *   - user {string} - Email des Users
 *   - action {string} - "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "EXPORT"
 *   - resource {string} - Entity Type (z.B. "Einheiten")
 *   - resourceId {string} - ID der betroffenen Entity
 *   - changes {object} - Optional: Bei UPDATE die geänderten Felder
 *   - affectedCount {number} - Optional: Bei Cascade Delete die Anzahl
 *   - status {string} - "success" | "failed"
 *   - errorMessage {string} - Optional: Fehlermeldung
 *   - ip {string} - Optional: Client IP Address
 */
export async function logAuditEvent(base44, event) {
  try {
    // Validierung
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      console.warn('Incomplete audit event:', event);
      return;
    }

    // Validiere Action
    const allowedActions = ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'EXPORT'];
    if (!allowedActions.includes(event.action)) {
      console.warn(`Invalid action: ${event.action}`);
      return;
    }

    // Validiere Status
    const allowedStatus = ['success', 'failed'];
    if (!allowedStatus.includes(event.status)) {
      console.warn(`Invalid status: ${event.status}`);
      return;
    }

    // Create Audit Log Entry
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    });

    // Log to console
    if (event.status === 'success') {
      console.log(
        `[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId}`
      );
    } else {
      console.warn(
        `[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId} FAILED: ${event.errorMessage}`
      );
    }
  } catch (error) {
    // Non-blocking: Logging darf Operation nicht blockieren
    console.error('[AUDIT_ERROR]', error.message);
  }
}

/**
 * Retrieve audit history for a resource
 */
export async function getAuditHistory(base44, resourceType, resourceId) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      resource_type: resourceType,
      resource_id: resourceId,
    });
  } catch (error) {
    console.error('Audit history error:', error);
    return [];
  }
}

/**
 * Retrieve audit trail for a user
 */
export async function getUserAuditTrail(base44, userEmail, limit = 50) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      user_email: userEmail,
    }, '-created_date', limit);
  } catch (error) {
    console.error('User audit trail error:', error);
    return [];
  }
}

/**
 * Find all failed operations
 */
export async function getFailedOperations(base44, limit = 100) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      status: 'failed',
    }, '-created_date', limit);
  } catch (error) {
    console.error('Failed operations error:', error);
    return [];
  }
}