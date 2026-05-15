/**
 * addEinheitMemberSecure.js
 *
 * Sichere Backend-Funktion zum Hinzufügen/Aktualisieren von Einheit-Mitgliedern.
 *
 * Validiert:
 *  1. Authentifizierung
 *  2. Rate-Limiting (siehe @MIGRATION_BLOCKER unten)
 *  3. Eingabe-Parameter + Rolle aus VALID_ROLES
 *  4. Existenz der Einheit
 *  5. RBAC: Globale Admin-/Fachschaftsrolle ODER delegierte Unit-LEITUNG.
 *     Eine delegierte LEITUNG darf KEINE weiteren LEITUNGen vergeben und
 *     bestehende LEITUNGen nicht herabstufen – nur EDITOR/READER verwalten.
 *  6. Existenz des Ziel-Benutzers über die `Benutzer`-Tabelle
 *     (Fallback: User-Auth-Tabelle für `full_name`-Auflösung).
 *  7. Audit-Log für SUCCESS und DENIED.
 *
 * Rückgabe: { success, message, membershipId, operation, grantedBy }
 *
 * ─── @MIGRATION_NOTE (Supabase) ───────────────────────────────────────
 *  • E-Mails als Schlüssel (`user_email`, `user_id`-FK in `Benutzer`)
 *    werden auf UUID umgestellt.
 *  • Die manuelle 3-Tabellen-Rechteprüfung (User-Auth → Benutzer →
 *    EinheitMembers) entfällt komplett zugunsten von RLS-Policies
 *    auf `EinheitMembers`.
 *  • Rolle und Fachzuständigkeiten sollten als Custom JWT Claims gepflegt
 *    werden, damit RLS ohne teure Cross-Table-Joins prüfen kann.
 *  • Membership-Views/Queries müssen fehlende Benutzer-Profile als LEFT JOIN
 *    behandeln, da Fallbacks auf die Auth-User-Tabelle möglich sind.
 *  • E-Mail-Felder werden hier normalisiert gespeichert; in Supabase sollte
 *    dies zusätzlich über citext oder lower(email)-Indexe abgesichert werden.
 *  • Die Inline-Kopie des Rate-Limiters (siehe unten) wird durch einen
 *    Redis/Upstash-basierten Limiter ersetzt – Single Source of Truth
 *    bleibt `functions/utils/rateLimiter.js`.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_ROLES = ['LEITUNG', 'EDITOR', 'READER'];
const DELEGABLE_ROLES_BY_UNIT_LEITUNG = ['EDITOR', 'READER']; // anti-privilege-escalation

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// ──────────────────────────────────────────────────────────────────────
// Inline-Kopie aus functions/utils/rateLimiter.js (Single Source of Truth).
// Begründung: Base44/Deno-Deploy erlaubt aktuell keine lokalen Imports
// zwischen Functions. Bei Änderungen an der Quelle MUSS dieser Block
// synchron mitgepflegt werden (Suche nach `isRateLimited`).
//
// @MIGRATION_BLOCKER: IN-MEMORY STATE — siehe Header von rateLimiter.js.
// In horizontal skalierten/Edge-Deployments NICHT verlässlich; Migration
// auf Redis (Upstash) ist Teil des Supabase-Schwenks.
// ──────────────────────────────────────────────────────────────────────
const requestLog = new Map();
const CLEANUP_EVERY_N_REQUESTS = 500;
const CLEANUP_MAX_MAP_SIZE = 5000;
const DEFAULT_ENTRY_TTL_MS = 5 * 60 * 1000;
let _requestCounter = 0;

function isRateLimited(userIdentifier, functionName, maxRequests = 20, windowMs = 60000) {
  if (!userIdentifier) {
    console.warn('[rateLimiter] called without userIdentifier – treating as limited');
    return true;
  }
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
    _maybeRunCleanup();
    return true;
  }
  timestamps.push(now);
  _maybeRunCleanup();
  return false;
}

function _maybeRunCleanup() {
  _requestCounter += 1;
  if (_requestCounter >= CLEANUP_EVERY_N_REQUESTS || requestLog.size >= CLEANUP_MAX_MAP_SIZE) {
    _requestCounter = 0;
    const now = Date.now();
    for (const [key, timestamps] of requestLog.entries()) {
      while (timestamps.length > 0 && now - timestamps[0] >= DEFAULT_ENTRY_TTL_MS) {
        timestamps.shift();
      }
      if (timestamps.length === 0) requestLog.delete(key);
    }
  }
}

/**
 * Prüft, ob ein User die Berechtigung hat, Mitglieder zur Einheit hinzuzufügen.
 *
 * RBAC-Regeln:
 *  1. Administrator: darf jeder Einheit Mitglieder hinzufügen, jede Rolle.
 *  2. Fachschaftsleitung MIT Fachzuständigkeit für `einheit.fach`:
 *     darf jede Rolle vergeben.
 *  3. Beliebige globale Rolle MIT delegierter Unit-LEITUNG:
 *     darf NUR EDITOR/READER vergeben und darf bestehende LEITUNG-Rollen
 *     nicht überschreiben/herabstufen.
 *
 * Hinweis: Die delegierte Unit-LEITUNG überstimmt also die globale Rolle.
 * Auch ein „Betrachter", der für genau diese Einheit zur LEITUNG ernannt
 * wurde, darf einladen (aber nur eingeschränkt). Das deckt den im
 * Code-Review bemängelten Referendar-/Vertretungsfall sauber ab.
 */
function canUserAddMembers({ rolle, faecher, einheitFach, delegatedRole, requestedRole, existingRole }) {
  // 1. Administrator
  if (rolle === 'Administrator') {
    return { allowed: true, reason: 'admin_global' };
  }

  // 2. Fachschaftsleitung im eigenen Fach
  if (rolle === 'Fachschaftsleitung') {
    if (Array.isArray(faecher) && faecher.includes(einheitFach)) {
      return { allowed: true, reason: 'fachschaft_fach' };
    }
    return { allowed: false, reason: 'fachschaft_wrong_fach' };
  }

  // 3. Delegierte Unit-LEITUNG – egal welche globale Rolle.
  if (delegatedRole === 'LEITUNG') {
    if (existingRole === 'LEITUNG') {
      return {
        allowed: false,
        reason: 'unit_leitung_cannot_modify_existing_leitung',
      };
    }
    if (!DELEGABLE_ROLES_BY_UNIT_LEITUNG.includes(requestedRole)) {
      return {
        allowed: false,
        reason: 'unit_leitung_cannot_delegate_leitung',
      };
    }
    return { allowed: true, reason: 'unit_leitung_delegated' };
  }

  return { allowed: false, reason: 'insufficient_role' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.warn('[addEinheitMemberSecure] Unauthorized access attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.email, 'addEinheitMemberSecure', 10, 60000)) {
      console.warn(`[addEinheitMemberSecure] Rate limit exceeded for ${user.email}`);
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { einheitId, targetEmail, newRole } = await req.json();
    const normalizedTargetEmail = normalizeEmail(targetEmail);
    const normalizedUserEmail = normalizeEmail(user.email);

    if (!einheitId || !normalizedTargetEmail || !newRole) {
      console.warn(`[addEinheitMemberSecure] Missing parameters from ${user.email}`);
      return Response.json(
        { error: 'Missing required parameters: einheitId, targetEmail, newRole' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(newRole)) {
      console.warn(`[addEinheitMemberSecure] Invalid role ${newRole} from ${user.email}`);
      return Response.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Einheit existiert?
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      console.warn(`[addEinheitMemberSecure] Einheit ${einheitId} not found (requested by ${user.email})`);
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Current-User-Profil (Benutzer ist Single Source of Truth, User-Auth nur für admin-Flag).
    const benutzerArr = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: normalizedUserEmail,
    });
    const profil = benutzerArr[0];
    const istBase44Admin = user.role === 'Administrator' || user.role === 'admin';
    const rolle = istBase44Admin ? 'Administrator' : (profil?.rolle || 'Betrachter');
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // Delegierte Unit-Rolle des Current Users.
    const unitMemberships = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
    }, undefined, 1000);
    const myMembership = (unitMemberships || []).find(
      (member) => normalizeEmail(member.user_email) === normalizedUserEmail
    );
    const delegatedRole = myMembership?.unit_role || null;

    // Existierende Membership vor der Berechtigungsprüfung laden, damit
    // delegierte LEITUNG-Nutzer bestehende LEITUNG-Rollen nicht herabstufen können.
    const existingMember = (unitMemberships || []).find(
      (member) => normalizeEmail(member.user_email) === normalizedTargetEmail
    );
    const existingMembers = existingMember ? [existingMember] : [];
    const existingRole = existingMember?.unit_role || null;

    // Berechtigung prüfen.
    const authCheck = canUserAddMembers({
      rolle,
      faecher,
      einheitFach: einheit.fach,
      delegatedRole,
      requestedRole: newRole,
      existingRole,
    });

    if (!authCheck.allowed) {
      console.warn(
        `[addEinheitMemberSecure] DENIED - ${user.email} (role: ${rolle}, delegated: ${delegatedRole || 'none'}) ` +
        `tried to add member to ${einheitId} (${einheit.fach}) as ${newRole}. Reason: ${authCheck.reason}`
      );

      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'EinheitMembers',
          resource_id: einheitId,
          changes: {
            attempt: 'add_member',
            targetEmail: normalizedTargetEmail,
            requestedRole: newRole,
            globalRole: rolle,
            delegatedRole,
          },
          affected_count: 0,
          status: 'failed',
          error_message: `Permission denied: ${authCheck.reason}`,
        });
      } catch (auditErr) {
        console.error('[addEinheitMemberSecure] Failed to write audit log:', auditErr);
      }

      return Response.json(
        {
          error: 'Insufficient permissions to add members to this Einheit',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            userRole: rolle,
            userFaecher: faecher,
            einheitFach: einheit.fach,
            delegatedRole,
            requestedRole: newRole,
            existingRole,
            denyReason: authCheck.reason,
          },
        },
        { status: 403 }
      );
    }

    // Ziel-Benutzer existiert? — primäre Quelle: Benutzer-Tabelle (konsistent mit
    // dem Rest des Skripts). Display-Name wird aus Benutzer.vorname/nachname
    // gebildet; falls kein Benutzer-Profil existiert, fällt der Code auf die
    // User-Auth-Tabelle (`full_name`) zurück.
    const targetBenutzerArr = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: normalizedTargetEmail,
    });
    let targetDisplayName = null;

    if (targetBenutzerArr.length > 0) {
      const tb = targetBenutzerArr[0];
      targetDisplayName = `${tb.vorname || ''} ${tb.nachname || ''}`.trim() || null;
    } else {
      const targetUserArr = await base44.asServiceRole.entities.User.filter({
        email: normalizedTargetEmail,
      });
      if (targetUserArr.length === 0) {
        console.warn(
          `[addEinheitMemberSecure] Target user ${targetEmail} not found (requested by ${user.email})`
        );
        return Response.json({ error: 'Target user not found' }, { status: 404 });
      }
      targetDisplayName = targetUserArr[0].full_name || null;
    }

    let operation = 'created';
    let membershipId = null;

    if (existingMembers.length > 0) {
      const existingMember = existingMembers[0];
      membershipId = existingMember.id;
      operation = 'updated';

      // Beim Updaten greift dieselbe Privilege-Escalation-Regel:
      // delegierte LEITUNG-Nutzer dürfen weder neue LEITUNGen setzen
      // noch bestehende LEITUNGen herabstufen.
      if (existingMember.unit_role !== newRole) {
        await base44.asServiceRole.entities.EinheitMembers.update(membershipId, {
          unit_role: newRole,
        });
      }
    } else {
      const newMember = await base44.asServiceRole.entities.EinheitMembers.create({
        einheit_id: einheitId,
        user_email: normalizedTargetEmail,
        user_name: targetDisplayName || normalizedTargetEmail,
        unit_role: newRole,
      });
      membershipId = newMember.id;
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'EinheitMembers',
        resource_id: einheitId,
        changes: {
          targetUser: normalizedTargetEmail,
          role: newRole,
          operation,
          grantedBy: authCheck.reason,
          existingRole,
          membershipId,
        },
        affected_count: 1,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[addEinheitMemberSecure] Failed to write audit log:', auditErr);
    }

    console.info(
      `[addEinheitMemberSecure] SUCCESS - ${user.email} ${operation} member ${normalizedTargetEmail} ` +
      `to ${einheitId} with role ${newRole} (grantedBy: ${authCheck.reason})`
    );

    return Response.json({
      success: true,
      message: `Member ${normalizedTargetEmail} successfully ${operation} with role ${newRole}`,
      membershipId,
      operation,
      grantedBy: authCheck.reason,
    });
  } catch (error) {
    console.error('[addEinheitMemberSecure] Unexpected error:', error);
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