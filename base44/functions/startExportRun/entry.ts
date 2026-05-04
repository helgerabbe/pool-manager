/**
 * startExportRun.js
 *
 * Phase H — Lifecycle-Übergang `final_freigegeben → export_running`.
 *
 * Wird vom Export-Center aufgerufen, sobald der Moodle-Spezialist auf
 * „Export starten" klickt. Markiert die Einheit als „im Export". Ab diesem
 * Punkt:
 *   - Inhalte bleiben gesperrt (isContentLocked === true).
 *   - „Freigabe aufheben" in der Einheit ist NICHT mehr möglich.
 *     Aufhebung kann nur noch durch das Export-Center erfolgen
 *     (z. B. durch finalizeExportCompletion, das auf 'draft' zurücksetzt).
 *
 * Payload:  { einheitId: string }
 * RBAC:     Administrator | Fachschaftsleitung | Moodle-Designer
 * Antwort:  { ok, newStatus, changed_at, changed_by, started_at, started_by }
 * Fehler:   { error, code }
 *           400 missing einheitId
 *           401 unauthorized
 *           403 forbidden
 *           404 einheit nicht gefunden
 *           409 INVALID_TRANSITION (status ≠ 'final_freigegeben')
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Konstanten synchron mit src/lib/exportLifecycle.js (NO LOCAL IMPORTS).
const STATUS_FINAL = 'final_freigegeben';
const STATUS_EXPORT_RUNNING = 'export_running';

const ALLOWED_ROLES = ['Administrator', 'Fachschaftsleitung', 'Moodle-Designer'];

async function logAuditEvent(base44, event) {
  try {
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      return;
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });

    // RBAC.
    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    if (!profil || !ALLOWED_ROLES.includes(profil.rolle)) {
      return Response.json(
        { error: 'Forbidden: Admin, Fachschaftsleitung oder Moodle-Designer erforderlich.' },
        { status: 403 }
      );
    }

    // Einheit laden.
    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const currentStatus = einheit.export_lifecycle_status || 'draft';

    // Idempotenz: bereits running → no-op (kein Fehler).
    if (currentStatus === STATUS_EXPORT_RUNNING) {
      return Response.json({
        ok: true,
        newStatus: STATUS_EXPORT_RUNNING,
        changed_at: einheit.export_lifecycle_changed_at || null,
        changed_by: einheit.export_lifecycle_changed_by || null,
        started_at: einheit.export_started_at || null,
        started_by: einheit.export_started_by || null,
        noop: true,
      });
    }

    // State-Übergang nur aus 'final_freigegeben' erlaubt.
    if (currentStatus !== STATUS_FINAL) {
      return Response.json(
        {
          error:
            'Ungültiger Übergang: Export kann nur aus dem Status „final_freigegeben" gestartet werden.',
          code: 'INVALID_TRANSITION',
          currentStatus,
        },
        { status: 409 }
      );
    }

    // Update.
    const nowIso = new Date().toISOString();
    const update = {
      export_lifecycle_status: STATUS_EXPORT_RUNNING,
      export_lifecycle_changed_at: nowIso,
      export_lifecycle_changed_by: user.email,
      export_started_at: nowIso,
      export_started_by: user.email,
    };
    await base44.asServiceRole.entities.Einheiten.update(einheitId, update);

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event: 'export_started',
        fach: einheit.fach,
        from: currentStatus,
        to: STATUS_EXPORT_RUNNING,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus: STATUS_EXPORT_RUNNING,
      changed_at: nowIso,
      changed_by: user.email,
      started_at: nowIso,
      started_by: user.email,
    });
  } catch (error) {
    console.error('[startExportRun] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});