/**
 * updateTaskWithStateTransition.js
 *
 * Exemplarische Backend-Funktion für Task-Updates mit State-Machine-Logik.
 * Demonstriert die synced → modified & pending_export → blockiert Fallunterscheidung.
 *
 * State Machine:
 *   new           → beliebig bearbeitbar
 *   exported      → bei Edit → modified
 *   modified      → beliebig bearbeitbar
 *   pending_export → bei Edit → ERROR (blockiert)
 *   to_delete     → bei Edit → ERROR (blockiert)
 *   approved      → bei Edit → modified (wenn Freigabe)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// State Machine Konstanten
const TASK_SYNC_STATUS = {
  NEW: 'new',
  EXPORTED: 'exported',
  MODIFIED: 'modified',
  PENDING_EXPORT: 'pending_export',
  TO_DELETE: 'to_delete',
  APPROVED: 'approved',
};

const TASK_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
};

// Allowed Transitions: currentStatus → newStatus
const ALLOWED_TRANSITIONS = {
  [TASK_SYNC_STATUS.NEW]: [
    TASK_SYNC_STATUS.EXPORTED,
    TASK_SYNC_STATUS.APPROVED,
    TASK_SYNC_STATUS.MODIFIED,
  ],
  [TASK_SYNC_STATUS.EXPORTED]: [
    TASK_SYNC_STATUS.MODIFIED,
    TASK_SYNC_STATUS.APPROVED,
  ],
  [TASK_SYNC_STATUS.MODIFIED]: [
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.EXPORTED,
    TASK_SYNC_STATUS.APPROVED,
  ],
  [TASK_SYNC_STATUS.APPROVED]: [
    TASK_SYNC_STATUS.MODIFIED,
  ],
  [TASK_SYNC_STATUS.PENDING_EXPORT]: [], // Blockiert
  [TASK_SYNC_STATUS.TO_DELETE]: [],      // Blockiert
};

/**
 * Berechnet automatisch den neuen sync_status basierend auf aktuellem Status
 * und Edit-Operation.
 *
 * Regel:
 *   - new/modified → bleiben wie sind (können bearbeitet werden)
 *   - exported → wird zu modified
 *   - approved → wird zu modified (bei Inhaltsänderung)
 *   - pending_export, to_delete → ERROR
 */
function computeSyncStatusForSave(currentSyncStatus, isContentChange) {
  // Blockierte Zustände → Fehler werfen
  if (currentSyncStatus === TASK_SYNC_STATUS.PENDING_EXPORT) {
    throw new Error(
      'Aufgabe wird gerade exportiert. Bearbeitungen sind nicht möglich. Bitte versuchen Sie es später erneut.'
    );
  }

  if (currentSyncStatus === TASK_SYNC_STATUS.TO_DELETE) {
    throw new Error('Aufgabe ist zum Löschen markiert. Bearbeitungen nicht möglich.');
  }

  // Automatische Übergänge
  if (isContentChange) {
    if (currentSyncStatus === TASK_SYNC_STATUS.EXPORTED) {
      return TASK_SYNC_STATUS.MODIFIED;
    }
    if (currentSyncStatus === TASK_SYNC_STATUS.APPROVED) {
      return TASK_SYNC_STATUS.MODIFIED;
    }
  }

  // Ansonsten: Status bleibt gleich
  return currentSyncStatus || TASK_SYNC_STATUS.NEW;
}

/**
 * Hauptfunktion: Task mit State-Machine-Validierung aktualisieren
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authentifizierung
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
    // 1. Aktuellen Task laden
    // ─────────────────────────────────────────────────────────────────────
    const currentTask = await base44.entities.Aufgabenbausteine.get(taskId);

    if (!currentTask) {
      return Response.json(
        { error: 'Aufgabe nicht gefunden' },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. State Machine: Fallunterscheidung für sync_status
    // ─────────────────────────────────────────────────────────────────────
    const isContentChange =
      updates.aufgabentext_inhalt !== undefined ||
      updates.field_values !== undefined ||
      updates.titel !== undefined;

    const newSyncStatus = computeSyncStatusForSave(
      currentTask.sync_status || TASK_SYNC_STATUS.NEW,
      isContentChange
    );

    // ─────────────────────────────────────────────────────────────────────
    // 3. Freigabe-Logik (status: approved setzt sync_status: approved)
    // ─────────────────────────────────────────────────────────────────────
    let finalSyncStatus = newSyncStatus;
    if (updates.status === TASK_STATUS.APPROVED) {
      finalSyncStatus = TASK_SYNC_STATUS.APPROVED;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Update durchführen
    // ─────────────────────────────────────────────────────────────────────
    const updatePayload = {
      ...updates,
      sync_status: finalSyncStatus,
      last_synced_at: currentTask.last_synced_at, // Unverändert
    };

    const updatedTask = await base44.entities.Aufgabenbausteine.update(
      taskId,
      updatePayload
    );

    // ─────────────────────────────────────────────────────────────────────
    // 5. Audit-Logging (optional)
    // ─────────────────────────────────────────────────────────────────────
    await base44.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Aufgabenbausteine',
      resource_id: taskId,
      changes: {
        old_sync_status: currentTask.sync_status,
        new_sync_status: finalSyncStatus,
        is_content_change: isContentChange,
      },
      status: 'success',
    });

    return Response.json({
      success: true,
      task: updatedTask,
      sync_status_transition: {
        from: currentTask.sync_status || TASK_SYNC_STATUS.NEW,
        to: finalSyncStatus,
        reason: isContentChange ? 'content_change' : 'metadata_update',
      },
    });

  } catch (error) {
    // State Machine Fehler (pending_export, to_delete)
    if (error.message.includes('blockiert') || error.message.includes('nicht möglich')) {
      return Response.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }

    // Andere Fehler
    return Response.json(
      { error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
});