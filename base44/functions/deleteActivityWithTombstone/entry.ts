/**
 * deleteActivityWithTombstone.js
 *
 * Soft-Delete für Aktivitäten mit kaskadierten Updates
 *
 * Sicherheit & Architektur:
 * - Vorgelagerte Lese-Operation zur Lock-Prüfung
 * - Bearbeitungs-Lock-Validierung auf übergeordnetem Lernpaket
 * - Kaskadierendes Tombstone auf untergeordnete Aufgabenbausteine
 * - UI filtert sync_status='to_delete' automatisch
 * - Export-Center kann Tombstones noch abrufen
 *
 * Supabase-Migrationsnotiz:
 * Bei PostgreSQL/Supabase sollte diese Soft-Delete-Kaskade nicht in Node.js
 * erfolgen, sondern transaktionssicher über einen Trigger:
 * AFTER UPDATE OF sync_status ON lernpaket_phase_aktivitaet
 * WHEN NEW.sync_status = 'to_delete'
 * → setzt alle untergeordneten aufgabenbausteine automatisch auf to_delete.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ─────────────────────────────────────────────────────────────────
    // 1. Authentifizierung
    // ─────────────────────────────────────────────────────────────────
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { activity_id } = body;

    if (!activity_id) {
      return Response.json({ error: 'Missing activity_id' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Aktivität laden (vorgelagerte Lese-Operation)
    // ─────────────────────────────────────────────────────────────────
    const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.read(activity_id);

    if (!activity) {
      return Response.json(
        { error: 'Aktivität nicht gefunden' },
        { status: 404 }
      );
    }

    const lernpaketId = activity.lernpaket_id;

    if (!lernpaketId) {
      return Response.json(
        { error: 'Aktivität hat kein zugeordnetes Lernpaket' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Lock-Prüfung: User muss strukturellen Lock halten
    // ─────────────────────────────────────────────────────────────────
    let lernpaket = null;
    try {
      // Versuche im User-Kontext zu lesen (Autorisierungsprüfung)
      lernpaket = await base44.entities.Lernpakete.read(lernpaketId);
    } catch {
      return Response.json(
        { error: 'Forbidden: Sie haben keine Zugriff auf dieses Lernpaket' },
        { status: 403 }
      );
    }

    // Lock-Validierung: User muss den Lock halten
    const isLockedByUser = lernpaket.locked_by_email === user.email && lernpaket.is_locked;
    if (!isLockedByUser) {
      return Response.json(
        {
          error: 'Forbidden: Sie müssen einen Bearbeitungs-Lock auf diesem Lernpaket halten',
          currentLock: lernpaket.locked_by_email || null,
        },
        { status: 403 }
      );
    }

    // ⛔ PHASE 2: Export-Lock-Enforcement (KRITISCH!)
    // Blockiert alle Deletes während eines aktiven Moodle-Exports
    if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
      console.warn(
        `[deleteActivityWithTombstone] BLOCKED by export lock - ${user.email} tried to delete ${activity_id} ` +
        `but export is in progress (export_locked=${lernpaket.export_locked}, moodle_sync_status=${lernpaket.moodle_sync_status})`
      );
      return Response.json(
        {
          error: 'Delete abgelehnt: Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.',
          code: 'EXPORT_LOCKED',
          details: {
            export_locked: lernpaket.export_locked,
            moodle_sync_status: lernpaket.moodle_sync_status,
            lernpaketId: lernpaket.id
          }
        },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. Aktivität auf to_delete setzen (Tombstone)
    // ─────────────────────────────────────────────────────────────────
    const updated = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity_id, {
      sync_status: 'to_delete',
    });

    // ─────────────────────────────────────────────────────────────────
    // 5. Kaskadierendes Update: Untergeordnete Aufgabenbausteine (parallel)
    // ─────────────────────────────────────────────────────────────────
    let cascadedCount = 0;
    let cascadeFailedCount = 0;
    try {
      // Finde alle Aufgabenbausteine, die zu dieser Aktivität gehören.
      // Explizites Limit verhindert, dass SDK-Defaults nur die ersten 50/100 Kinder liefern.
      const childTasks = await base44.asServiceRole.entities.Aufgabenbausteine.filter(
        { aktivitaet_id: activity_id },
        undefined,
        1000
      );

      // Paralleles Update: Alle Tasks markieren + Lock-Felder zurücksetzen.
      // allSettled stellt sicher, dass ein einzelner Fehler die übrigen Updates nicht abbricht.
      if (childTasks.length > 0) {
        const updatePromises = childTasks.map(task =>
          base44.asServiceRole.entities.Aufgabenbausteine.update(task.id, {
            sync_status: 'to_delete',
            lock_status: null,
            locked_by_user: null,
            locked_at: null,
          })
        );
        const results = await Promise.allSettled(updatePromises);
        cascadedCount = results.filter(result => result.status === 'fulfilled').length;
        cascadeFailedCount = results.length - cascadedCount;

        results
          .filter(result => result.status === 'rejected')
          .forEach(result => console.error('[deleteActivityWithTombstone] Child cascade update failed:', result.reason));
      }

      console.info(
        `[deleteActivityWithTombstone] Cascaded to_delete: ${cascadedCount} tasks for activity ${activity_id} (failed: ${cascadeFailedCount}, Lock fields reset)`
      );
    } catch (cascadeError) {
      console.error(
        `[deleteActivityWithTombstone] Cascade error for activity ${activity_id}:`,
        cascadeError
      );
      // Nicht abbrechen - Aktivität wurde bereits gelöscht
      // Fehler wird in Response dokumentiert
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'DELETE',
        resource_type: 'LernpaketPhaseAktivitaet',
        resource_id: activity_id,
        changes: {
          tombstone: true,
          sync_status: 'to_delete',
          lernpaket_id: lernpaketId,
          cascaded_tasks_marked: cascadedCount,
          cascaded_tasks_failed: cascadeFailedCount,
        },
        affected_count: 1 + cascadedCount,
        status: cascadeFailedCount > 0 ? 'failed' : 'success',
        error_message: cascadeFailedCount > 0 ? `${cascadeFailedCount} Aufgabenbaustein(e) konnten nicht markiert werden` : null,
      });
    } catch (auditError) {
      console.error('[deleteActivityWithTombstone] Audit log failed:', auditError);
    }

    return Response.json({
      success: true,
      message: 'Aktivität und abhängige Aufgaben als "to_delete" markiert',
      activity: updated,
      cascaded: {
        tasksMarked: cascadedCount,
        tasksFailed: cascadeFailedCount,
      },
    });
  } catch (error) {
    console.error('[deleteActivityWithTombstone] Error:', error);
    return Response.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
});