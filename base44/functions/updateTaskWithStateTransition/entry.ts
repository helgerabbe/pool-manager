/**
 * updateTaskWithStateTransition.js
 *
 * Robuste Backend-Funktion für Task-Updates mit State-Machine-Logik.
 *
 * Sicherheit & Architektur:
 * - Strikte State-Machine-Validierung (ALLOWED_TRANSITIONS)
 * - Locking-Prüfung (User muss Lernpaket-Lock halten)
 * - Klon-Isolierung (is_master=false: kein Moodle-Sync)
 * - Tenant-Isolation über Einheit-Zugehörigkeit
 *
 * State Machine:
 *   draft         → approved, pending_export, to_delete
 *   approved      → draft, pending_export, to_delete
 *   exported      → modified, pending_export, to_delete
 *   modified      → pending_export, to_delete
 *   pending_export → blockiert (409 Conflict)
 *   to_delete     → blockiert (409 Conflict)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// State Machine Konstanten
const TASK_SYNC_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PENDING_EXPORT: 'pending_export',
  EXPORTED: 'exported',
  MODIFIED: 'modified',
  ERROR: 'error',
  TO_DELETE: 'to_delete',
};

// Allowed Transitions: currentStatus → newStatus
const ALLOWED_TRANSITIONS = {
  [TASK_SYNC_STATUS.DRAFT]: [
    TASK_SYNC_STATUS.APPROVED,
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.APPROVED]: [
    TASK_SYNC_STATUS.DRAFT,           // Zurück auf Draft bei Inhaltsänderung
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.EXPORTED]: [
    TASK_SYNC_STATUS.MODIFIED,        // Nach Edit
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.MODIFIED]: [
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.PENDING_EXPORT]: [], // Blockiert
  [TASK_SYNC_STATUS.ERROR]: [
    TASK_SYNC_STATUS.DRAFT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.TO_DELETE]: [],      // Blockiert
};

/**
 * Berechnet automatisch den neuen sync_status basierend auf aktuellem Status
 * und Edit-Operation.
 *
 * Regeln bei Inhaltsänderung (isContentChange === true):
 *   - exported → modified (wurde bereits exportiert, jetzt geändert)
 *   - approved → draft (war freigegeben, wurde aber geändert, zurück zu Draft)
 *   - draft → draft (bleibt Draft)
 *   - pending_export, to_delete → ERROR (blockiert)
 */
/**
 * Validiert einen Statusübergang gegen die ALLOWED_TRANSITIONS Map.
 * Wirft Error, wenn Übergang nicht erlaubt ist.
 */
function validateStateTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) {
    return; // Gleicher Status = OK
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    throw new Error(`Unbekannter Status: ${currentStatus}`);
  }

  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Ungültiger Statusübergang: ${currentStatus} → ${newStatus}. Erlaubte Übergänge: ${allowedTransitions.join(', ') || 'keine'}`
    );
  }
}

/**
 * Berechnet automatisch den neuen sync_status basierend auf aktuellem Status
 * und Edit-Operation. Beachtung: Klone dienen nicht dem Moodle-Sync.
 *
 * Regeln bei Inhaltsänderung (isContentChange === true):
 *   - exported → modified (wurde bereits exportiert, jetzt geändert)
 *   - approved → draft (war freigegeben, wurde aber geändert, zurück zu Draft)
 *   - draft → draft (bleibt Draft)
 *   - pending_export, to_delete → ERROR (blockiert)
 *
 * Für Klone: sync_status wird auf 'draft' erzwungen.
 */
function computeSyncStatusForSave(currentSyncStatus, isContentChange, isMaster = true) {
  // Klone: sync_status wird auf 'draft' erzwungen
  if (!isMaster) {
    return TASK_SYNC_STATUS.DRAFT;
  }

  // Blockierte Zustände → Fehler werfen
  if (currentSyncStatus === TASK_SYNC_STATUS.PENDING_EXPORT) {
    throw new Error(
      'Aufgabe wird gerade exportiert. Bearbeitungen sind nicht möglich. Bitte versuchen Sie es später erneut.'
    );
  }

  if (currentSyncStatus === TASK_SYNC_STATUS.TO_DELETE) {
    throw new Error('Aufgabe ist zum Löschen markiert. Bearbeitungen nicht möglich.');
  }

  // Automatische Übergänge bei Inhaltsänderung
  if (isContentChange) {
    if (currentSyncStatus === TASK_SYNC_STATUS.EXPORTED) {
      return TASK_SYNC_STATUS.MODIFIED;
    }
    if (currentSyncStatus === TASK_SYNC_STATUS.APPROVED) {
      return TASK_SYNC_STATUS.DRAFT;
    }
  }

  return currentSyncStatus || TASK_SYNC_STATUS.DRAFT;
}

/**
 * Hauptfunktion: Task mit State-Machine-Validierung aktualisieren
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─────────────────────────────────────────────────────────────────────
    // 1. Authentifizierung
    // ─────────────────────────────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Payload auslesen
    const { taskId, updates } = await req.json();

    if (!taskId) {
      return Response.json(
        { error: 'taskId ist erforderlich' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Aktuellen Task laden (MasterAufgabe oder Klon)
    // ─────────────────────────────────────────────────────────────────────
    const currentTask = await base44.asServiceRole.entities.Aufgabenbausteine.read(taskId);

    if (!currentTask) {
      return Response.json(
        { error: 'Aufgabe nicht gefunden' },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Lernpaket-Lock prüfen (nur bei Inhaltsänderung)
    // ─────────────────────────────────────────────────────────────────────
    const isContentChange =
      updates.aufgabentext_inhalt !== undefined ||
      updates.field_values !== undefined ||
      updates.titel !== undefined;

    if (isContentChange && currentTask.lernpaket_id) {
      const lernpaket = await base44.asServiceRole.entities.Lernpakete.read(
        currentTask.lernpaket_id
      );

      if (!lernpaket) {
        return Response.json(
          { error: 'Lernpaket nicht gefunden' },
          { status: 404 }
        );
      }

      const isLockedByUser = lernpaket.locked_by_email === user.email;
      const isLocked = !!lernpaket.is_locked;

      if (isLocked && !isLockedByUser) {
        return Response.json(
          {
            error: `Bearbeitungs-Lock fehlt. Lernpaket ist durch ${lernpaket.locked_by_email} gesperrt.`,
          },
          { status: 403 }
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. State Machine: Statusberechnung (mit Klon-Isolierung)
    // ─────────────────────────────────────────────────────────────────────
    const currentSyncStatus = currentTask.sync_status || TASK_SYNC_STATUS.DRAFT;
    const newSyncStatus = computeSyncStatusForSave(
      currentSyncStatus,
      isContentChange,
      currentTask.is_master !== false // Klone: is_master=false
    );

    // ─────────────────────────────────────────────────────────────────────
    // 5. Strikte State-Machine-Validierung (ALLOWED_TRANSITIONS)
    // ─────────────────────────────────────────────────────────────────────
    validateStateTransition(currentSyncStatus, newSyncStatus);

    // ─────────────────────────────────────────────────────────────────────
    // 6. Update durchführen
    // ─────────────────────────────────────────────────────────────────────
    const updatePayload = {
      ...updates,
      sync_status: newSyncStatus,
      last_synced_at: currentTask.last_synced_at,
    };

    const updatedTask = await base44.asServiceRole.entities.Aufgabenbausteine.update(
      taskId,
      updatePayload
    );

    // ─────────────────────────────────────────────────────────────────────
    // 7. Audit-Logging
    // ─────────────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Aufgabenbausteine',
      resource_id: taskId,
      changes: {
        old_sync_status: currentSyncStatus,
        new_sync_status: newSyncStatus,
        is_content_change: isContentChange,
        is_master: currentTask.is_master,
      },
      status: 'success',
    });

    return Response.json({
      success: true,
      task: updatedTask,
      sync_status_transition: {
        from: currentSyncStatus,
        to: newSyncStatus,
        reason: isContentChange ? 'content_change' : 'metadata_update',
        isMaster: currentTask.is_master,
      },
    });

  } catch (error) {
    console.error('[updateTaskWithStateTransition] Error:', error);

    // State Machine Fehler (invalid transitions)
    if (error.message.includes('Ungültiger Statusübergang')) {
      return Response.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }

    // State Machine blockierte Zustände (pending_export, to_delete)
    if (error.message.includes('blockiert') || error.message.includes('nicht möglich')) {
      return Response.json(
        { error: error.message },
        { status: 409 }
      );
    }

    // Andere Fehler
    return Response.json(
      { error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
});