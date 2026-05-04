/**
 * confirmExportPublished.js
 *
 * Phase H — Lifecycle-Übergang `export_running → published`.
 *
 * Wird vom Export-Center aufgerufen, nachdem der Moodle-Spezialist die
 * Veröffentlichung in Moodle/Brian manuell bestätigt hat. Konsequenzen:
 *   - Inhalte sind wieder editierbar (isContentLocked → false).
 *   - Versionierungs-Phase beginnt: nachfolgende Edits markieren Items als
 *     'modified' (das passiert in updateActivitySecure / updateLernpaketSecure
 *     bereits unabhängig vom Lifecycle, ist aber ab hier didaktisch sinnvoll).
 *
 * Hinweis: Der „eigentliche" Reset auf 'draft' nach Erfassen der
 * Erfolgs-/Fehlerquoten erfolgt weiter über `finalizeExportCompletion`.
 * Diese Funktion hier ist die ALTERNATIVE „Happy Path"-Bestätigung
 * (alles erfolgreich, kein partieller Fehler) — sie hebt die Inhalts-Sperre
 * auf, ohne die Sync-Status der Items en bloc anzufassen.
 *
 * Payload:  { einheitId: string }
 * RBAC:     Administrator | Fachschaftsleitung | Moodle-Designer
 * Antwort:  { ok, newStatus, changed_at, changed_by, published_at, published_by }
 * Fehler:   { error, code }
 *           400 missing einheitId
 *           401 unauthorized
 *           403 forbidden
 *           404 einheit nicht gefunden
 *           409 INVALID_TRANSITION (status ≠ 'export_running')
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_EXPORT_RUNNING = 'export_running';
const STATUS_PUBLISHED = 'published';

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

    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    if (!profil || !ALLOWED_ROLES.includes(profil.rolle)) {
      return Response.json(
        { error: 'Forbidden: Admin, Fachschaftsleitung oder Moodle-Designer erforderlich.' },
        { status: 403 }
      );
    }

    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const currentStatus = einheit.export_lifecycle_status || 'draft';

    // Idempotenz: bereits published → no-op.
    if (currentStatus === STATUS_PUBLISHED) {
      return Response.json({
        ok: true,
        newStatus: STATUS_PUBLISHED,
        changed_at: einheit.export_lifecycle_changed_at || null,
        changed_by: einheit.export_lifecycle_changed_by || null,
        published_at: einheit.export_published_at || null,
        published_by: einheit.export_published_by || null,
        noop: true,
      });
    }

    // State-Übergang nur aus 'export_running' erlaubt.
    if (currentStatus !== STATUS_EXPORT_RUNNING) {
      return Response.json(
        {
          error:
            'Ungültiger Übergang: Veröffentlichung kann nur aus dem Status „export_running" bestätigt werden.',
          code: 'INVALID_TRANSITION',
          currentStatus,
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const update = {
      export_lifecycle_status: STATUS_PUBLISHED,
      export_lifecycle_changed_at: nowIso,
      export_lifecycle_changed_by: user.email,
      export_published_at: nowIso,
      export_published_by: user.email,
    };
    await base44.asServiceRole.entities.Einheiten.update(einheitId, update);

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event: 'export_published',
        fach: einheit.fach,
        from: currentStatus,
        to: STATUS_PUBLISHED,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus: STATUS_PUBLISHED,
      changed_at: nowIso,
      changed_by: user.email,
      published_at: nowIso,
      published_by: user.email,
    });
  } catch (error) {
    console.error('[confirmExportPublished] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});