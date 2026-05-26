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

// Globale Rollen mit fachübergreifendem Zugriff. Fachschaftsleitung wird
// zusätzlich auf das Fach der Einheit eingegrenzt (siehe isAllowedForFach
// unten), damit niemand fremde Fächer in den Export schicken kann —
// analog zu setEinheitFreigabeStatus.
const ROLE_ADMIN = 'Administrator';
const ROLE_FACHSCHAFT = 'Fachschaftsleitung';
const ROLE_MOODLE_DESIGNER = 'Moodle-Designer';
const GLOBAL_ROLES = [ROLE_ADMIN, ROLE_MOODLE_DESIGNER];

function isAllowedForFach(profil, fach) {
  if (!profil?.rolle) return false;
  if (GLOBAL_ROLES.includes(profil.rolle)) return true;
  if (profil.rolle === ROLE_FACHSCHAFT) {
    const faecher = Array.isArray(profil.fachbereich_zustaendigkeit)
      ? profil.fachbereich_zustaendigkeit
      : [];
    return faecher.includes(fach);
  }
  return false;
}

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
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { einheitId } = body;
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });

    // Einheit im User-Kontext laden, damit RLS/Tenant-Isolation für die Fach-Prüfung greift.
    let einheit;
    try {
      einheit = await base44.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden oder nicht zugänglich' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden oder nicht zugänglich' }, { status: 404 });

    // RBAC: Admin und Moodle-Designer dürfen alle Fächer starten.
    // Fachschaftsleitung nur das eigene Fach der Einheit.
    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    if (!isAllowedForFach(profil, einheit.fach)) {
      return Response.json(
        {
          error:
            'Forbidden: Nur Administrator, Moodle-Designer oder die Fachschaftsleitung des betreffenden Fachs darf den Export starten.',
        },
        { status: 403 }
      );
    }

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

    // Re-Read gegen TOCTOU: Status muss unmittelbar vor dem Schreiben noch final sein.
    const latestEinheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    const latestStatus = latestEinheit?.export_lifecycle_status || 'draft';
    if (!latestEinheit || latestStatus !== currentStatus) {
      return Response.json(
        {
          error: 'Der Status wurde zwischenzeitlich geändert. Bitte neu laden.',
          code: 'STATUS_CHANGED',
          currentStatus: latestStatus,
          expectedStatus: currentStatus,
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
    await base44.entities.Einheiten.update(einheitId, update);

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