/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * deleteActivityWithTombstone.js
 *
 * Soft-Delete einer Aktivität mit:
 * - Lock-Prüfung (Bearbeitungs-Lock für Lernpaket erforderlich)
 * - Kaskadierendes Tombstone auf untergeordnete Aufgabenbausteine
 * - Audit-Logging
 */

Deno.serve(async (req) => {
  try {
    // ── AUTHENTIFIZIERUNG ────────────────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── INPUT VALIDIERUNG ────────────────────────────────────────────────────────
    const { activity_id } = await req.json();

    if (!activity_id) {
      return Response.json(
        { error: 'activity_id ist erforderlich' },
        { status: 400 }
      );
    }

    // ── 1. AKTIVITÄT LADEN ───────────────────────────────────────────────────────
    const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
      id: activity_id,
    });

    if (!activities || activities.length === 0) {
      return Response.json(
        { error: 'Aktivität nicht gefunden' },
        { status: 404 }
      );
    }

    const activity = activities[0];
    const lernpaket_id = activity.lernpaket_id;

    // ── 2. LOCK-PRÜFUNG ──────────────────────────────────────────────────────────
    const lernpakete = await base44.entities.Lernpakete.filter({
      id: lernpaket_id,
    });

    if (!lernpakete || lernpakete.length === 0) {
      return Response.json(
        { error: 'Lernpaket nicht gefunden' },
        { status: 404 }
      );
    }

    const lp = lernpakete[0];

    // Prüfe: Hat der User einen aktiven Lock auf dieses Lernpaket?
    const hasLock = lp.is_locked && lp.locked_by_email === user.email;
    const lockExpired = lp.locked_at ? isLockExpired(lp.locked_at) : false;

    if (!hasLock || lockExpired) {
      return Response.json(
        { 
          error: 'Bearbeitungs-Lock fehlt oder ist abgelaufen',
          message: 'Du musst das Lernpaket sperren, um Aktivitäten zu löschen'
        },
        { status: 403 }
      );
    }

    // ── 3. AKTIVITÄT AUF TOMBSTONE SETZEN ────────────────────────────────────────
    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity_id, {
      sync_status: 'to_delete',
    });

    // ── 4. KASKADIERENDES UPDATE AUF UNTERGEORDNETE AUFGABENBAUSTEINE ────────────
    const childTasks = await base44.asServiceRole.entities.Aufgabenbausteine.filter({
      aktivitaet_id: activity_id,
    });

    let cascadedCount = 0;

    for (const task of childTasks) {
      await base44.asServiceRole.entities.Aufgabenbausteine.update(task.id, {
        sync_status: 'to_delete',
      });
      cascadedCount++;
    }

    // ── 5. AUDIT LOG ─────────────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'DELETE',
      resource_type: 'LernpaketPhaseAktivitaet',
      resource_id: activity_id,
      changes: { sync_status: 'to_delete', cascaded_tasks: cascadedCount },
      affected_count: cascadedCount + 1,
      status: 'success',
    });

    // ── RESPONSE ─────────────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      message: 'Aktivität und abhängige Aufgaben als "to_delete" markiert',
      activityId: activity_id,
      cascadedTo: cascadedCount,
      metadata: {
        deletedAt: new Date().toISOString(),
        user: user.email,
      },
    });

  } catch (error) {
    console.error('Error in deleteActivityWithTombstone:', error);
    return Response.json(
      { error: error.message || 'Fehler beim Löschen der Aktivität' },
      { status: 500 }
    );
  }
});

/**
 * Prüfe, ob ein Lock abgelaufen ist (30 Minuten Timeout)
 */
function isLockExpired(lockedAt) {
  const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten
  const now = new Date();
  const lockDate = new Date(lockedAt);
  return now.getTime() - lockDate.getTime() > LOCK_TIMEOUT_MS;
}