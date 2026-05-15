/**
 * removeEinheitMemberSecure.js
 *
 * Sichere Backend-Funktion zum Entfernen von Einheit-Mitgliedern.
 *
 * Payload: { einheitId, targetEmail }
 *
 * Validiert:
 *  1. Authentifizierung
 *  2. Rate-Limiting
 *  3. Eingabe-Parameter
 *  4. Existenz der Einheit und Membership
 *  5. RBAC: Admin, zuständige Fachschaftsleitung oder delegierte Unit-LEITUNG
 *  6. Hierarchie-Schutz: delegierte LEITUNG darf keine LEITUNG entfernen
 *  7. Selbst-Entfernung: erlaubt, außer man ist die letzte LEITUNG
 *  8. Audit-Log für SUCCESS und DENIED
 *
 * ─── @MIGRATION_NOTE (Supabase) ───────────────────────────────────────
 *  • E-Mails als Schlüssel werden auf UUID umgestellt.
 *  • Rolle und Fachzuständigkeiten sollten als Custom JWT Claims gepflegt
 *    werden, damit RLS ohne teure Cross-Table-Joins prüfen kann.
 *  • Last-LEITUNG-Prüfung sollte in Supabase transaktional erfolgen
 *    (Stored Procedure), damit keine Einheit versehentlich verwaist.
 *  • Die Inline-Kopie des Rate-Limiters wird durch einen Redis/Upstash-
 *    basierten Limiter ersetzt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const requestLog = new Map();
const CLEANUP_EVERY_N_REQUESTS = 500;
const CLEANUP_MAX_MAP_SIZE = 5000;
const DEFAULT_ENTRY_TTL_MS = 5 * 60 * 1000;
let requestCounter = 0;

function isRateLimited(userIdentifier, functionName, maxRequests = 20, windowMs = 60000) {
  if (!userIdentifier) return true;

  const key = `${userIdentifier}::${functionName}`;
  const now = Date.now();
  let timestamps = requestLog.get(key);

  if (!timestamps) {
    timestamps = [];
    requestLog.set(key, timestamps);
  }

  while (timestamps.length > 0 && now - timestamps[0] >= windowMs) {
    timestamps.shift();
  }

  if (timestamps.length >= maxRequests) {
    maybeRunCleanup();
    return true;
  }

  timestamps.push(now);
  maybeRunCleanup();
  return false;
}

function maybeRunCleanup() {
  requestCounter += 1;
  if (requestCounter < CLEANUP_EVERY_N_REQUESTS && requestLog.size < CLEANUP_MAX_MAP_SIZE) return;

  requestCounter = 0;
  const now = Date.now();
  for (const [key, timestamps] of requestLog.entries()) {
    while (timestamps.length > 0 && now - timestamps[0] >= DEFAULT_ENTRY_TTL_MS) {
      timestamps.shift();
    }
    if (timestamps.length === 0) requestLog.delete(key);
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isGlobalAdmin(user, profil) {
  return user.role === 'admin' || user.role === 'Administrator' || profil?.rolle === 'Administrator';
}

function canRemoveMember({ userEmail, targetEmail, rolle, faecher, einheitFach, delegatedRole, targetRole, isLastLeitung }) {
  const isSelfRemoval = userEmail === targetEmail;

  if (isSelfRemoval) {
    if (targetRole === 'LEITUNG' && isLastLeitung) {
      return { allowed: false, reason: 'cannot_remove_last_leitung' };
    }
    return { allowed: true, reason: 'self_removal' };
  }

  if (rolle === 'Administrator') {
    return { allowed: true, reason: 'admin_global' };
  }

  if (rolle === 'Fachschaftsleitung') {
    if (Array.isArray(faecher) && faecher.includes(einheitFach)) {
      return { allowed: true, reason: 'fachschaft_fach' };
    }
    return { allowed: false, reason: 'fachschaft_wrong_fach' };
  }

  if (delegatedRole === 'LEITUNG') {
    if (targetRole === 'LEITUNG') {
      return { allowed: false, reason: 'unit_leitung_cannot_remove_leitung' };
    }
    return { allowed: true, reason: 'unit_leitung_delegated' };
  }

  return { allowed: false, reason: 'insufficient_role' };
}

async function writeAudit(base44, { userEmail, einheitId, targetEmail, targetRole, status, reason, membershipId }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: userEmail,
      action: 'DELETE',
      resource_type: 'EinheitMembers',
      resource_id: einheitId,
      changes: {
        targetEmail,
        targetRole,
        membershipId: membershipId || null,
      },
      affected_count: status === 'success' ? 1 : 0,
      status,
      error_message: status === 'failed' ? `Permission denied: ${reason}` : null,
    });
  } catch (auditErr) {
    console.error('[removeEinheitMemberSecure] Failed to write audit log:', auditErr);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.email, 'removeEinheitMemberSecure', 10, 60000)) {
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { einheitId, targetEmail } = await req.json();
    const normalizedTargetEmail = normalizeEmail(targetEmail);
    const normalizedUserEmail = normalizeEmail(user.email);

    if (!einheitId || !normalizedTargetEmail) {
      return Response.json(
        { error: 'Missing required parameters: einheitId, targetEmail' },
        { status: 400 }
      );
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const memberships = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: normalizedTargetEmail,
    });
    const membership = memberships[0];

    if (!membership) {
      return Response.json({ error: 'Membership not found' }, { status: 404 });
    }

    const targetRole = membership.unit_role;

    const benutzerArr = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    const profil = benutzerArr[0];
    const rolle = isGlobalAdmin(user, profil) ? 'Administrator' : (profil?.rolle || 'Betrachter');
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    const myMembership = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: user.email,
    });
    const delegatedRole = myMembership[0]?.unit_role || null;

    const leitungen = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      unit_role: 'LEITUNG',
    });
    const isLastLeitung = targetRole === 'LEITUNG' && (leitungen || []).length <= 1;

    const authCheck = canRemoveMember({
      userEmail: normalizedUserEmail,
      targetEmail: normalizedTargetEmail,
      rolle,
      faecher,
      einheitFach: einheit.fach,
      delegatedRole,
      targetRole,
      isLastLeitung,
    });

    if (!authCheck.allowed) {
      await writeAudit(base44, {
        userEmail: user.email,
        einheitId,
        targetEmail: normalizedTargetEmail,
        targetRole,
        status: 'failed',
        reason: authCheck.reason,
        membershipId: membership.id,
      });

      return Response.json(
        {
          error: 'Insufficient permissions to remove this member from the Einheit',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            delegatedRole,
            targetRole,
            isLastLeitung,
            denyReason: authCheck.reason,
          },
        },
        { status: 403 }
      );
    }

    await base44.asServiceRole.entities.EinheitMembers.delete(membership.id);

    await writeAudit(base44, {
      userEmail: user.email,
      einheitId,
      targetEmail: normalizedTargetEmail,
      targetRole,
      status: 'success',
      reason: authCheck.reason,
      membershipId: membership.id,
    });

    return Response.json({
      success: true,
      message: `Member ${normalizedTargetEmail} successfully removed`,
      membershipId: membership.id,
      removedBy: authCheck.reason,
    });
  } catch (error) {
    console.error('[removeEinheitMemberSecure] Unexpected error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      { status: 500 }
    );
  }
});