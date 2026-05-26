/**
 * mbkMarkEinheitPublished.js
 *
 * MBK-Konsole — "Einheit in Moodle aktiv" / "Veröffentlichung markieren".
 *
 * Setzt eine Einheit direkt auf den Lifecycle-Status `published`,
 * unabhängig vom aktuellen Vorzustand. Dadurch:
 *   - gilt die Einheit als "in Sync mit Moodle" (Sync-Berechnung im Frontend
 *     basiert auf `export_published_at` als Cutoff-Zeitstempel),
 *   - werden nachfolgende Edits als 'modified' markiert (Versionierung
 *     beginnt — analog zu confirmExportPublished).
 *
 * Bewusst eigenständig (statt confirmExportPublished zu recyclen), weil
 * confirmExportPublished einen strikten Übergang aus `export_running`
 * verlangt. Der MBK-Operator umgeht den 4-Schritte-Lifecycle und bestätigt
 * direkt aus dem Tool heraus, dass die Einheit live ist.
 *
 * Payload: { einheitId: string }
 * RBAC:    Administrator | Fachschaftsleitung (nur eigenes Fach) | Moodle-Designer
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_PUBLISHED = 'published';
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
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: 1,
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

    let einheit;
    try {
      // RLS/Tenant-Isolation muss hier greifen: kein asServiceRole beim Laden der Ziel-Einheit.
      einheit = await base44.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden oder keine Berechtigung' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden oder keine Berechtigung' }, { status: 404 });

    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    if (!isAllowedForFach(profil, einheit.fach)) {
      return Response.json(
        { error: 'Forbidden: Nur Administrator, Moodle-Designer oder die Fachschaftsleitung des Fachs darf die Veröffentlichung markieren.' },
        { status: 403 }
      );
    }

    const previousStatus = einheit.export_lifecycle_status || 'draft';
    const nowIso = new Date().toISOString();

    await base44.entities.Einheiten.update(einheitId, {
      export_lifecycle_status: STATUS_PUBLISHED,
      export_lifecycle_changed_at: nowIso,
      export_lifecycle_changed_by: user.email,
      export_published_at: nowIso,
      export_published_by: user.email,
    });

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event: 'mbk_marked_published',
        fach: einheit.fach,
        from: previousStatus,
        to: STATUS_PUBLISHED,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus: STATUS_PUBLISHED,
      published_at: nowIso,
      published_by: user.email,
      previousStatus,
    });
  } catch (error) {
    console.error('[mbkMarkEinheitPublished] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});