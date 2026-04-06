/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * updateTaskWithStateTransition.js
 * 
 * Sichere State-Machine für Aufgabenbausteine mit:
 * - Validierte Statusübergänge (ALLOWED_TRANSITIONS)
 * - Locking-Validierung (Lernpaket-Lock erforderlich)
 * - Klon-Isolierung (is_master === false)
 * - Korrekte Sync-Status-Verwaltung
 */

// ── STATE-MACHINE DEFINITIONEN ──────────────────────────────────────────────────

const TASK_SYNC_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  SYNCED: 'synced',
  MODIFIED: 'modified',
  TO_DELETE: 'to_delete',
};

// Erlaubte Übergänge zwischen Sync-Status
const ALLOWED_TRANSITIONS = {
  [TASK_SYNC_STATUS.DRAFT]: [
    TASK_SYNC_STATUS.PENDING,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.PENDING]: [
    TASK_SYNC_STATUS.SYNCED,
    TASK_SYNC_STATUS.DRAFT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.SYNCED]: [
    TASK_SYNC_STATUS.MODIFIED,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.MODIFIED]: [
    TASK_SYNC_STATUS.PENDING,
    TASK_SYNC_STATUS.SYNCED,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.TO_DELETE]: [
    TASK_SYNC_STATUS.DRAFT,
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, updateData, newSyncStatus } = await req.json();

    if (!taskId) {
      return Response.json({ error: 'taskId ist erforderlich' }, { status: 400 });
    }

    // ── 1. AUFGABENBAUSTEIN LESEN ───────────────────────────────────────────────
    const tasks = await base44.asServiceRole.entities.Aufgabenbausteine.filter({ id: taskId });
    if (!tasks || tasks.length === 0) {
      return Response.json({ error: 'Aufgabenbaustein nicht gefunden' }, { status: 404 });
    }

    const currentTask = tasks[0];

    // ── 2. KLON-ISOLIERUNG: is_master prüfen ──────────────────────────────────
    // Klone dürfen NIEMALS in die State-Machine eintreten
    if (currentTask.is_master === false) {
      // Für Klone: sync_status wird immer auf draft gesetzt oder ignoriert
      const safeUpdateData = { ...updateData };
      delete safeUpdateData.sync_status; // Sync-Status darf nicht verändert werden

      await base44.asServiceRole.entities.Aufgabenbausteine.update(taskId, {
        ...safeUpdateData,
        sync_status: TASK_SYNC_STATUS.DRAFT, // Klone bleiben immer im DRAFT-Status
      });

      return Response.json({
        success: true,
        message: 'Klon aktualisiert (Sync-Status ignoriert für Klone)',
        isClon: true,
        updatedFields: { ...safeUpdateData, sync_status: TASK_SYNC_STATUS.DRAFT },
      });
    }

    // ── 3. LOCKING-VALIDIERUNG ─────────────────────────────────────────────────
    // Lernpaket laden zur Lock-Prüfung
    if (!currentTask.lernpaket_id) {
      return Response.json(
        { error: 'Aufgabenbaustein hat keine Zuordnung zu Lernpaket' },
        { status: 400 }
      );
    }

    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      id: currentTask.lernpaket_id,
    });
    if (!lernpakete || lernpakete.length === 0) {
      return Response.json(
        { error: 'Lernpaket nicht gefunden (Zugehörigkeitsprüfung fehlgeschlagen)' },
        { status: 403 }
      );
    }

    const lernpaket = lernpakete[0];
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

    const isLocked =
      lernpaket.is_locked &&
      lernpaket.locked_by_email === user.email &&
      lernpaket.locked_at &&
      Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

    if (!isLocked) {
      return Response.json(
        {
          error: 'Bearbeitungs-Lock erforderlich',
          detail: lernpaket.is_locked && lernpaket.locked_by_email !== user.email
            ? `Lernpaket ist durch ${lernpaket.locked_by_email} gesperrt`
            : 'Lernpaket ist nicht durch Sie gesperrt oder Lock ist abgelaufen',
        },
        { status: 403 }
      );
    }

    // ── 4. STATE-MACHINE VALIDIERUNG ───────────────────────────────────────────
    const currentSyncStatus = currentTask.sync_status || TASK_SYNC_STATUS.DRAFT;
    const finalSyncStatus = newSyncStatus || currentSyncStatus;

    // Wenn Statusübergang vorhanden: validiere gegen ALLOWED_TRANSITIONS
    if (newSyncStatus && newSyncStatus !== currentSyncStatus) {
      const allowedTargets = ALLOWED_TRANSITIONS[currentSyncStatus];
      if (!allowedTargets || !allowedTargets.includes(finalSyncStatus)) {
        return Response.json(
          {
            error: 'Ungültiger Statusübergang',
            detail: `Von '${currentSyncStatus}' zu '${finalSyncStatus}' nicht erlaubt. Erlaubte Ziele: ${allowedTargets?.join(', ') || 'keine'}`,
            currentStatus: currentSyncStatus,
            requestedStatus: finalSyncStatus,
          },
          { status: 409 }
        );
      }
    }

    // ── 5. UPDATE AUSFÜHREN ─────────────────────────────────────────────────────
    const updatePayload = {
      ...updateData,
      sync_status: finalSyncStatus,
    };

    await base44.asServiceRole.entities.Aufgabenbausteine.update(taskId, updatePayload);

    // ── 6. AUDIT-LOG ERSTELLEN ─────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Aufgabenbaustein',
      resource_id: taskId,
      changes: {
        sync_status: {
          from: currentSyncStatus,
          to: finalSyncStatus,
        },
        ...Object.keys(updateData || {}).reduce((acc, key) => {
          acc[key] = {
            from: currentTask[key],
            to: updateData[key],
          };
          return acc;
        }, {}),
      },
      status: 'success',
    });

    // ── 7. RESPONSE ─────────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      message: 'Aufgabenbaustein aktualisiert mit State-Machine-Validierung',
      isClon: false,
      transitionDetails: {
        from: currentSyncStatus,
        to: finalSyncStatus,
        isTransition: currentSyncStatus !== finalSyncStatus,
      },
      updatedFields: updatePayload,
    });

  } catch (error) {
    console.error('Error in updateTaskWithStateTransition:', error);
    return Response.json(
      { error: error.message || 'Fehler beim Update' },
      { status: 500 }
    );
  }
});