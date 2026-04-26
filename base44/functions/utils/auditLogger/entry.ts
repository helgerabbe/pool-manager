/**
 * auditLogger.js - Zentrale Audit Trail Funktion
 * 
 * Verantwortlich für das Logging aller Security-relevanten Operationen.
 * Fehler beim Logging blockieren niemals die Haupt-Operation (non-blocking).
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

    // Create Audit Log Entry
    const auditEntry = {
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    };

    // Non-blocking: Logging ist never critical path
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
 * Schnelle Batch-Logging für mehrere Events
 * Nützlich für Cascade Deletes mit vielen Entities
 */
export async function logAuditEventsBatch(base44, events) {
  const promises = events.map((event) => logAuditEvent(base44, event));
  
  try {
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('[AUDIT_ERROR] Batch logging failed:', error);
  }
}

/**
 * Hilfs-Funktion: Findet alle Audit Logs für eine bestimmte Resource
 * (Für Admin Reports / Compliance)
 */
export async function getAuditHistory(base44, resourceType, resourceId) {
  try {
    return await base44.asServiceRole.entities.AuditLog.filter({
      resource_type: resourceType,
      resource_id: resourceId,
    });
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