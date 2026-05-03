/**
 * setEinheitFreigabeStatus
 *
 * Schritt 3 des dreistufigen Freigabe-Workflows: setzt den finalen Status der
 * gesamten Einheit (`einheit_freigabe_status`).
 *
 * Payload:
 *   { einheitId: string,
 *     newStatus: 'final_freigegeben' | 'draft' }
 *
 * Verhalten:
 *   - newStatus === 'final_freigegeben' (LOCK):
 *       Server prüft, dass ALLE 4 Lerntyp-Dashboards mindestens eine
 *       Membership mit pfad_status='locked_for_export' haben (= geprüft).
 *       Erlaubt für Administrator + Fachschaftsleitung (im Fach der Einheit).
 *   - newStatus === 'draft' (UNLOCK):
 *       Hebt die finale Freigabe auf. Dashboards bleiben unverändert
 *       (sie verlieren ihren locked_for_export-Status NICHT).
 *       Erlaubt für Administrator + Fachschaftsleitung (im Fach).
 *
 * Antwort: { ok: true, newStatus, freigegeben_at, freigegeben_by }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function logAuditEvent(base44, event) {
  try {
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      console.warn('[AUDIT] incomplete event', event);
      return;
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const STATUS_FINAL = 'final_freigegeben';
const STATUS_DRAFT = 'draft';
const VALID_STATUS = [STATUS_FINAL, STATUS_DRAFT];

const ROLLEN = { ADMIN: 'Administrator', FACHSCHAFT: 'Fachschaftsleitung' };

function isAdmin(authUser, profil) {
  if (authUser?.role === 'Administrator' || authUser?.role === 'admin') return true;
  return profil?.rolle === ROLLEN.ADMIN;
}

function isFachschaftFuerFach(profil, fach) {
  if (profil?.rolle !== ROLLEN.FACHSCHAFT) return false;
  const faecher = Array.isArray(profil.fachbereich_zustaendigkeit)
    ? profil.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId, newStatus } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });
    if (!VALID_STATUS.includes(newStatus)) {
      return Response.json({ error: 'invalid newStatus' }, { status: 400 });
    }

    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // RBAC: nur Admin oder Fachschaft (im Fach).
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;
    const allowed = isAdmin(user, profil) || isFachschaftFuerFach(profil, einheit.fach);
    if (!allowed) {
      return Response.json(
        { error: 'Forbidden: nur Administrator oder Fachschaftsleitung dürfen die Einheit final freigeben.' },
        { status: 403 }
      );
    }

    // Pre-Flight für LOCK: alle 4 Lerntypen müssen mindestens einen LOCKED-Eintrag haben.
    if (newStatus === STATUS_FINAL) {
      const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheitId,
      });
      const lockedLerntypen = new Set(
        (memberships || [])
          .filter((m) => m.pfad_status === 'locked_for_export')
          .map((m) => m.lerntyp)
      );
      const fehlend = VALID_LERNTYPEN.filter((lt) => !lockedLerntypen.has(lt));
      if (fehlend.length > 0) {
        return Response.json(
          {
            error: 'Es sind noch nicht alle 4 Dashboards geprüft.',
            code: 'DASHBOARDS_NOT_ALL_LOCKED',
            fehlende_lerntypen: fehlend,
          },
          { status: 409 }
        );
      }
    }

    const nowIso = new Date().toISOString();
    const update =
      newStatus === STATUS_FINAL
        ? {
            einheit_freigabe_status: STATUS_FINAL,
            einheit_freigegeben_at: nowIso,
            einheit_freigegeben_by: user.email,
          }
        : {
            einheit_freigabe_status: STATUS_DRAFT,
            einheit_freigegeben_at: null,
            einheit_freigegeben_by: null,
          };

    await base44.asServiceRole.entities.Einheiten.update(einheitId, update);

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event: newStatus === STATUS_FINAL ? 'einheit_final_freigegeben' : 'einheit_freigabe_aufgehoben',
        fach: einheit.fach,
        einheit_freigabe_status: newStatus,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus,
      freigegeben_at: update.einheit_freigegeben_at,
      freigegeben_by: update.einheit_freigegeben_by,
    });
  } catch (error) {
    console.error('[setEinheitFreigabeStatus] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});