/**
 * mbkToggleExportLock
 *
 * MBK-interner Sperr-Schalter für eine Einheit, die gerade in Moodle
 * exportiert wird.
 *
 * Hintergrund:
 *   - Sobald eine Einheit `final_freigegeben` ist, darf die Fachschaftsleitung
 *     die Freigabe normalerweise aus dem Lernpfad-Architekt heraus aufheben
 *     (`setEinheitFreigabeStatus newStatus='draft'`).
 *   - Während das Moodle-Team in der MBK-Konsole bereits an der Einheit
 *     arbeitet (Dateien generieren, Manifest prüfen, ZIP packen), darf das
 *     NICHT passieren — sonst werden mitten im Export plötzlich Inhalte
 *     bearbeitbar oder ändern sich unter den Händen des Operators.
 *
 * Lösung:
 *   - Der Operator setzt im MBK-Header die Einheit auf
 *     `export_lifecycle_status='export_running'`. Damit greift die bestehende
 *     Sperrlogik in `setEinheitFreigabeStatus`: jede Aufhebung der Freigabe
 *     liefert dann 409 EXPORT_ALREADY_STARTED.
 *   - Wenn der Operator fertig ist (oder Korrekturen wünscht), setzt er die
 *     Einheit zurück auf `final_freigegeben`. Damit kann die
 *     Fachschaftsleitung wieder agieren.
 *
 * Payload:
 *   { einheitId: string, action: 'lock' | 'unlock' }
 *
 * Verhalten:
 *   - action='lock'   : final_freigegeben → export_running
 *   - action='unlock' : export_running    → final_freigegeben
 *   - Jeder andere Quell-Status liefert 409 INVALID_TRANSITION.
 *
 * Sicherheit:
 *   - Admin ODER Moodle-Designer dürfen den Schalter bedienen — das ist
 *     genau das Personal, das mit der MBK-Konsole arbeitet. Fachschafts-
 *     leitungen sind bewusst NICHT autorisiert: sie sollen den Lock nicht
 *     selbst lösen können.
 *
 * Antwort: { ok: true, newStatus, changed_at, changed_by }
 * Fehler:  { error, code?, currentStatus? }   (Status 400/401/403/404/409/500)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Synchron halten mit src/lib/exportLifecycle.js (NO LOCAL IMPORTS).
const STATUS_DRAFT = 'draft';
const STATUS_FINAL = 'final_freigegeben';
const STATUS_EXPORT_RUNNING = 'export_running';
const STATUS_PUBLISHED = 'published';

const ROLLEN = {
  ADMIN: 'Administrator',
  MOODLE_DESIGNER: 'Moodle-Designer',
};

function isAdmin(authUser, profil) {
  if (authUser?.role === 'Administrator' || authUser?.role === 'admin') return true;
  return profil?.rolle === ROLLEN.ADMIN;
}
function isMoodleDesigner(profil) {
  return profil?.rolle === ROLLEN.MOODLE_DESIGNER;
}

async function logAuditEvent(base44, event) {
  try {
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) return;
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
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId, action } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });
    if (action !== 'lock' && action !== 'unlock') {
      return Response.json({ error: "action muss 'lock' oder 'unlock' sein." }, { status: 400 });
    }

    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // RBAC: Admin oder Moodle-Designer.
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;
    const allowed = isAdmin(user, profil) || isMoodleDesigner(profil);
    if (!allowed) {
      return Response.json(
        { error: 'Forbidden: nur Administrator oder Moodle-Designer dürfen den Export-Lock setzen.' },
        { status: 403 }
      );
    }

    const currentStatus = einheit.export_lifecycle_status || STATUS_DRAFT;
    const targetStatus = action === 'lock' ? STATUS_EXPORT_RUNNING : STATUS_FINAL;
    const expectedSource = action === 'lock' ? STATUS_FINAL : STATUS_EXPORT_RUNNING;

    // Idempotenz: Ziel-Status bereits erreicht → no-op, kein Fehler.
    if (currentStatus === targetStatus) {
      return Response.json({
        ok: true,
        newStatus: targetStatus,
        changed_at: einheit.export_lifecycle_changed_at || null,
        changed_by: einheit.export_lifecycle_changed_by || null,
        noop: true,
      });
    }

    if (currentStatus !== expectedSource) {
      // Klare Fehlermeldungen je nach realem Zustand.
      let msg;
      if (action === 'lock') {
        if (currentStatus === STATUS_DRAFT) {
          msg = 'Die Einheit ist noch nicht final freigegeben — bitte zuerst im Lernpfad-Architekt freigeben.';
        } else if (currentStatus === STATUS_PUBLISHED) {
          msg = 'Die Einheit ist bereits in Moodle veröffentlicht und braucht keinen Export-Lock mehr.';
        } else {
          msg = 'Die Einheit kann von diesem Status aus nicht gesperrt werden.';
        }
      } else {
        if (currentStatus === STATUS_DRAFT) {
          msg = 'Die Einheit befindet sich nicht im Export — der Lock ist bereits aufgehoben.';
        } else if (currentStatus === STATUS_FINAL) {
          msg = 'Die Einheit ist nicht gesperrt — der Lock ist bereits aufgehoben.';
        } else if (currentStatus === STATUS_PUBLISHED) {
          msg = 'Die Einheit ist bereits in Moodle veröffentlicht — der Lock kann hier nicht mehr aufgehoben werden.';
        } else {
          msg = 'Die Einheit kann von diesem Status aus nicht entsperrt werden.';
        }
      }
      return Response.json(
        { error: msg, code: 'INVALID_TRANSITION', currentStatus },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const update = {
      export_lifecycle_status: targetStatus,
      export_lifecycle_changed_at: nowIso,
      export_lifecycle_changed_by: user.email,
    };
    // Nur beim 'lock' setzen wir die offiziellen Export-Start-Felder, damit
    // alle bestehenden Konsumenten (Cockpit-Hinweis, Audit-Trail) konsistent
    // bleiben. Beim 'unlock' lassen wir export_started_* unverändert — das
    // ist historische Information, kein State.
    if (action === 'lock') {
      update.export_started_at = nowIso;
      update.export_started_by = user.email;
    }

    await base44.asServiceRole.entities.Einheiten.update(einheitId, update);

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event: action === 'lock' ? 'mbk_export_lock_set' : 'mbk_export_lock_released',
        fach: einheit.fach,
        from: currentStatus,
        to: targetStatus,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus: targetStatus,
      changed_at: nowIso,
      changed_by: user.email,
    });
  } catch (error) {
    console.error('[mbkToggleExportLock] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});