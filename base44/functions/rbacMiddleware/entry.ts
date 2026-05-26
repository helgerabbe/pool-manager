/**
 * RBAC Middleware für Backend Security - Vereinfachte Version
 * Validiert alle Entity Operations auf RBAC-Basis
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── RBAC RULES ──────────────────────────────────────────────────────────

const RBAC_RULES = {
  Administrator: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH'], // Alles
  Fachschaftsleitung: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH'], // Mit Subject Check
  Fachlehrkraft: ['UPDATE', 'CREATE'], // Mit Unit Lead Check
  Betrachter: [], // Keine Writes
};

// ── CONTEXT RESOLUTION ──────────────────────────────────────────────────

function getTargetEinheitId(entityName, targetEntity) {
  if (!targetEntity) return null;
  if (targetEntity.einheit_id) return targetEntity.einheit_id;
  if (entityName === 'Einheiten' && targetEntity.id) return targetEntity.id;
  return null;
}

async function resolveEinheitContext(base44, entityName, targetEntity) {
  const einheitId = getTargetEinheitId(entityName, targetEntity);

  if (einheitId) {
    const einheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) {
      return { ok: false, reason: 'Einheit not accessible' };
    }
    return { ok: true, einheitId: einheit.id, fach: einheit.fach };
  }

  if (targetEntity?.fach) {
    return { ok: true, einheitId: null, fach: targetEntity.fach };
  }

  return { ok: false, reason: 'Missing unit or subject reference' };
}

// ── MAIN RBAC EVALUATION ────────────────────────────────────────────────

export async function evaluateRBAC(req, entityName, operation, targetEntity) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return { allowed: false, reason: 'Unauthenticated' };
    }

    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    if (!benutzerList || benutzerList.length === 0) {
      return { allowed: false, reason: 'User not registered' };
    }

    const benutzer = benutzerList[0];
    const role = benutzer.rolle;
    const subjects = benutzer.fachbereich_zustaendigkeit || [];

    // Rule für diese Rolle + Operation
    const allowedOps = RBAC_RULES[role] || [];
    if (!allowedOps.includes(operation)) {
      return {
        allowed: false,
        reason: `${role} cannot ${operation}`,
      };
    }

    const context = await resolveEinheitContext(base44, entityName, targetEntity);

    // Subject checks für Fachschaftsleitung — fail-closed bei unbekanntem Fach.
    if (role === 'Fachschaftsleitung') {
      if (!context.ok || !context.fach || !subjects.includes(context.fach)) {
        return {
          allowed: false,
          reason: context.reason || `Not responsible for subject: ${context.fach || 'unknown'}`,
        };
      }
    }

    // Unit Lead checks für Fachlehrkraft — fail-closed bei fehlender Einheit.
    if (role === 'Fachlehrkraft' && operation !== 'VIEW') {
      if (!context.ok || !context.einheitId) {
        return { allowed: false, reason: context.reason || 'Missing unit reference' };
      }

      const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: context.einheitId,
        user_email: user.email,
      });

      if (!membership || membership.length === 0 || membership[0].unit_role !== 'LEITUNG') {
        return { allowed: false, reason: 'Must be unit lead' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('RBAC error:', error);
    return { allowed: false, reason: 'RBAC check failed' };
  }
}

// ── AUDIT LOGGING ────────────────────────────────────────────────────────

export async function logAuditEvent(base44, event) {
  try {
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
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

Deno.serve(async () => {
  return Response.json(
    { error: 'rbacMiddleware is an internal helper and cannot be invoked directly' },
    { status: 405 }
  );
});