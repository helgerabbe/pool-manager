/**
 * setLernpfadStatus
 *
 * Atomares Lock/Unlock eines Lernpfads (Einheit + Lerntyp).
 *
 * Payload:
 *   { einheitId: string, lerntyp: 'minimalist'|'pragmatiker'|'ehrgeizig'|'passioniert',
 *     newStatus: 'locked_for_export' | 'draft' }
 *
 * Verhalten:
 *   - newStatus === 'locked_for_export':
 *       Erlaubt für Administrator, FACHSCHAFT (im Fach der Einheit),
 *       sowie Unit-LEITUNG. Setzt pfad_status auf 'locked_for_export'
 *       für alle Memberships dieser (einheit, lerntyp).
 *       Voraussetzung clientseitig: Pre-Flight (alle Items grün).
 *       Server validiert die Existenz mindestens eines Memberships nicht
 *       erneut (idempotent: leerer Pfad → 0 Updates, ok).
 *   - newStatus === 'draft':
 *       Entsperren. STRENGER: nur Administrator + FACHSCHAFT (im Fach).
 *       Unit-LEITUNG darf NICHT entsperren.
 *
 * Antwort: { ok: true, updated: number, lerntyp, newStatus }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Inline-Logger (NO LOCAL IMPORTS für Backend-Functions).
 * Schreibt non-blocking ins AuditLog. Bei Fehlern nur console-warn.
 */
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
    console.log(`[AUDIT] ${event.user} → ${event.action} ${event.resource}:${event.resourceId}`);
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

// Synchron halten mit src/lib/pfadStatus.js (NO LOCAL IMPORTS in Backend-Functions).
const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_STATUS_LOCKED = 'locked_for_export';
const PFAD_STATUS_DRAFT = 'draft';
const VALID_STATUS = [PFAD_STATUS_LOCKED, PFAD_STATUS_DRAFT];

// In Deno gibt es kein Path-Alias '@/...'. Wir duplizieren die wenigen
// RBAC-Konstanten lokal, damit die Function ohne lokale Imports auskommt
// (siehe Backend-Coding-Instruktionen: NO LOCAL IMPORTS).
const ROLLEN = {
  ADMIN: 'Administrator',
  FACHSCHAFT: 'Fachschaftsleitung',
  LEHRKRAFT: 'Fachlehrkraft',
};

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

async function isUnitLeitung(base44, einheitId, userEmail) {
  const members = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheitId,
    user_email: userEmail,
    unit_role: 'LEITUNG',
  });
  return Array.isArray(members) && members.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, lerntyp, newStatus } = await req.json();
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });
    if (!VALID_LERNTYPEN.includes(lerntyp)) {
      return Response.json({ error: 'invalid lerntyp' }, { status: 400 });
    }
    if (!VALID_STATUS.includes(newStatus)) {
      return Response.json({ error: 'invalid newStatus' }, { status: 400 });
    }

    // Einheit laden, um das Fach für RBAC zu kennen.
    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // Profil des Users laden (für rolle/faecher).
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;

    // ── RBAC ────────────────────────────────────────────────────────────
    const fach = einheit.fach;
    const admin = isAdmin(user, profil);
    const fachschaft = isFachschaftFuerFach(profil, fach);
    let allowed = admin || fachschaft;

    if (!allowed && newStatus === PFAD_STATUS_LOCKED) {
      // LEITUNG darf zusätzlich nur LOCK ausführen, nicht UNLOCK.
      allowed = await isUnitLeitung(base44, einheitId, user.email);
    }

    if (!allowed) {
      return Response.json(
        { error: 'Forbidden: nicht berechtigt für diese Aktion' },
        { status: 403 }
      );
    }

    // ── Update ──────────────────────────────────────────────────────────
    const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
      lerntyp,
    });

    let updated = 0;
    for (const m of memberships || []) {
      if (m.pfad_status === newStatus) continue;
      await base44.asServiceRole.entities.LernpfadAufgabeMembership.update(m.id, {
        pfad_status: newStatus,
      });
      updated += 1;
    }

    // ── Audit Log (non-blocking) ────────────────────────────────────────
    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH', // semantisch passend für Freigabe-/Entzug-Vorgänge
      resource: 'LernpfadAufgabeMembership',
      resourceId: `${einheitId}:${lerntyp}`,
      changes: {
        event: newStatus === PFAD_STATUS_LOCKED ? 'pfad_locked' : 'pfad_unlocked',
        lerntyp,
        einheit_id: einheitId,
        fach,
        affected_memberships: memberships?.length || 0,
        updated,
      },
      affectedCount: updated,
      status: 'success',
    });

    return Response.json({ ok: true, updated, lerntyp, newStatus });
  } catch (error) {
    console.error('[setLernpfadStatus] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});