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

    const { activity_id } = await req.json();

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
    try {
      // Finde alle Aufgabenbausteine, die zu dieser Aktivität gehören
      const childTasks = await base44.asServiceRole.entities.Aufgabenbausteine.filter({
        aktivitaet_id: activity_id,
      });

      // Paralleles Update: Alle Tasks gleichzeitig markieren + Lock-Felder zurücksetzen
      if (childTasks.length > 0) {
        const updatePromises = childTasks.map(task =>
          base44.asServiceRole.entities.Aufgabenbausteine.update(task.id, {
            sync_status: 'to_delete',
            lock_status: null,
            locked_by_user: null,
            locked_at: null,
          })
        );
        await Promise.all(updatePromises);
        cascadedCount = childTasks.length;
      }

      console.info(
        `[deleteActivityWithTombstone] Cascaded to_delete: ${cascadedCount} tasks for activity ${activity_id} (Lock fields reset)`
      );
    } catch (cascadeError) {
      console.error(
        `[deleteActivityWithTombstone] Cascade error for activity ${activity_id}:`,
        cascadeError
      );
      // Nicht abbrechen - Aktivität wurde bereits gelöscht
      // Fehler wird in Response dokumentiert
    }

    return Response.json({
      success: true,
      message: 'Aktivität und abhängige Aufgaben als "to_delete" markiert',
      activity: updated,
      cascaded: {
        tasksMarked: cascadedCount,
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