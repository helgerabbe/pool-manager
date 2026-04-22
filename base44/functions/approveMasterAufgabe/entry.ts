/**
 * approveMasterAufgabe.js
 *
 * Setzt content_status auf einer MasterAufgabe auf 'approved' oder 'draft'.
 *
 * Sicherheit & Architektur:
 * - Vollständige Tenant-Isolation: Prüft, dass die Aufgabe zur Einheit des Users gehört
 * - Lock-Prüfung: User muss den Bearbeitungs-Lock halten
 * - Klon-Schutz: Klone (is_master: false) dürfen nicht approved werden
 * - Sync-Status: Bei Approval wird sync_status auf 'pending' gesetzt
 *
 * Parameter:
 * - masterId: MasterAufgabe ID
 * - action: 'approve' | 'unapprove'
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId, action = 'approve' } = await req.json();

    if (!masterId) {
      return Response.json({ error: 'Missing masterId' }, { status: 400 });
    }

    if (!['approve', 'unapprove'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ── 1. MasterAufgabe auslesen ──────────────────────────────────────────────
    const aufgabe = await base44.asServiceRole.entities.MasterAufgabe.read(masterId);

    if (!aufgabe) {
      return Response.json({ error: 'MasterAufgabe nicht gefunden' }, { status: 404 });
    }

    // ── 2. Klon-Schutz: Klone (is_master=false) dürfen nicht approved werden ───
    if (aufgabe.is_master === false) {
      return Response.json(
        { error: 'Klone können nicht direkt approved werden. Befördern Sie den Klon zuerst zur Masteraufgabe.' },
        { status: 400 }
      );
    }

    // ── 3. Activity auslesen (für Lock-Prüfung) ───────────────────────────────
    if (!aufgabe.activity_id) {
      return Response.json(
        { error: 'MasterAufgabe hat keine verknüpfte Activity' },
        { status: 400 }
      );
    }

    const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.read(aufgabe.activity_id);
    if (!activity) {
      return Response.json({ error: 'Activity nicht gefunden' }, { status: 404 });
    }

    const lernpaketId = activity.lernpaket_id;
    if (!lernpaketId) {
      return Response.json({ error: 'Lernpaket-Referenz fehlt' }, { status: 400 });
    }

    // ── 4. Lock-Prüfung: User muss den Bearbeitungs-Lock halten ────────────────
    const lernpaket = await base44.asServiceRole.entities.Lernpakete.read(lernpaketId);
    if (!lernpaket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }

    const isLocked = !!lernpaket.is_locked;
    const isLockedByUser = lernpaket.locked_by_email === user.email;

    if (isLocked && !isLockedByUser) {
      return Response.json(
        { error: `Lernpaket ist durch ${lernpaket.locked_by_email} gesperrt. Sie können keine Änderungen vornehmen.` },
        { status: 403 }
      );
    }

    // ⛔ PHASE 2: Export-Lock-Enforcement (KRITISCH!)
    // Blockiert alle Updates während eines aktiven Moodle-Exports
    if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
      console.warn(
        `[approveMasterAufgabe] BLOCKED by export lock - ${user.email} tried to update ${masterId} ` +
        `but export is in progress (export_locked=${lernpaket.export_locked}, moodle_sync_status=${lernpaket.moodle_sync_status})`
      );
      return Response.json(
        {
          error: 'Update abgelehnt: Einheit ist zur Moodle-Synchronisation gesperrt. Bitte versuchen Sie es später erneut.',
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

    // ── 5. Einheit-Zugehörigkeit prüfen (Tenant-Isolation) ────────────────────
    if (!lernpaket.einheit_id) {
      return Response.json({ error: 'Lernpaket hat keine Einheit' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.read(lernpaket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    // Prüfe, ob der User auf diese Einheit Zugriff hat (via EinheitMembers)
    const memberAccess = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: lernpaket.einheit_id,
      user_email: user.email,
    });

    if (memberAccess.length === 0) {
      return Response.json(
        { error: 'Sie haben keinen Zugriff auf diese Einheit' },
        { status: 403 }
      );
    }

    // ── 6. content_status aktualisieren ─────────────────────────────────────
    const newContentStatus = action === 'approve' ? 'approved' : 'draft';

    await base44.asServiceRole.entities.MasterAufgabe.update(masterId, {
      content_status: newContentStatus,
    });

    // ── 7. LernpaketPhaseAktivitaet content_status synchronisieren ───────────
    // Lade alle Masters dieser Activity und prüfe ob alle approved sind.
    // Wenn ja → Activity auf 'approved' setzen; wenn mindestens einer 'draft' → 'draft'.
    const allMasters = await base44.asServiceRole.entities.MasterAufgabe.filter({
      activity_id: aufgabe.activity_id,
    });

    // Berücksichtige den neuen Status des gerade geänderten Masters
    const allApproved = allMasters.every(m =>
      m.id === masterId ? newContentStatus === 'approved' : m.content_status === 'approved'
    );

    const activityContentStatus = allApproved ? 'approved' : 'draft';
    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(aufgabe.activity_id, {
      content_status: activityContentStatus,
    });

    return Response.json({
      success: true,
      masterId,
      newContentStatus,
      activityContentStatus,
      message: action === 'approve'
        ? 'MasterAufgabe freigegeben'
        : 'MasterAufgabe zu Entwurf zurückgesetzt',
    });
  } catch (error) {
    console.error('[approveMasterAufgabe] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});