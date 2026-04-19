/**
 * addEinheitMemberSecure.js
 * 
 * Sichere Backend-Funktion zum Hinzufügen/Aktualisieren von Einheit-Mitgliedern.
 * 
 * Validiert:
 * 1. Current User hat Berechtigung (Global Admin/Fachschaft ODER Delegierte LEITUNG)
 * 2. Target User existiert
 * 3. Role ist valid (LEITUNG, EDITOR, READER)
 * 4. Audit-Log wird immer geschrieben
 * 
 * Rückgabe: { success: boolean, message: string, grantedBy: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Konstanten
const VALID_ROLES = ['LEITUNG', 'EDITOR', 'READER'];

// ✅ Rate-Limiter: In-Memory Tracking mit Timestamps
const requestLog = new Map();

function isRateLimited(userEmail, functionName, maxRequests = 10, windowMs = 60000) {
  const key = `${userEmail}::${functionName}`;
  const now = Date.now();
  
  if (!requestLog.has(key)) {
    requestLog.set(key, []);
  }
  
  const timestamps = requestLog.get(key);
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  requestLog.set(key, validTimestamps);
  
  if (validTimestamps.length >= maxRequests) {
    return true; // Limit überschritten
  }
  
  validTimestamps.push(now);
  requestLog.set(key, validTimestamps);
  return false;
}

/**
 * Prüft, ob ein User die Berechtigung hat, Mitglieder zur Einheit hinzuzufügen.
 * Akzeptiert EITHER globale Rolle ODER delegierte Leitung.
 * 
 * RBAC-Regeln:
 * 1. Administrator: Darf JEDER Einheit Mitarbeiter hinzufügen
 * 2. Fachschaftsleitung: Darf Einheiten im eigenen Fach Mitarbeiter hinzufügen
 * 3. Fachlehrkraft mit LEITUNG-Rolle: Darf NUR dieser einen Einheit Mitarbeiter hinzufügen (Unit-Level FSL)
 */
function canUserAddMembers(rolle, faecher, einheitFach, delegatedMembership) {
  // 1. Admin: immer erlaubt
  if (rolle === 'Administrator') {
    return { allowed: true, reason: 'admin_global' };
  }

  // 2. Fachschaftsleitung: nur im eigenen Fach
  if (rolle === 'Fachschaftsleitung') {
    if (Array.isArray(faecher) && faecher.includes(einheitFach)) {
      return { allowed: true, reason: 'fachschaft_fach' };
    }
    return { allowed: false, reason: 'fachschaft_wrong_fach' };
  }

  // 3. Fachlehrkraft mit delegierter LEITUNG: nur diese Einheit (Unit-Level FSL)
  if (rolle === 'Fachlehrkraft' && delegatedMembership?.unit_role === 'LEITUNG') {
    return { allowed: true, reason: 'lehrkraft_delegated_leitung' };
  }

  // Alle anderen: nicht erlaubt
  return { allowed: false, reason: 'insufficient_role' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 1. Authentifizierung prüfen
    if (!user) {
      console.warn('[addEinheitMemberSecure] Unauthorized access attempt');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Rate-Limiting: 10 Requests pro Minute pro User
    if (isRateLimited(user.email, 'addEinheitMemberSecure', 10, 60000)) {
      console.warn(`[addEinheitMemberSecure] Rate limit exceeded for ${user.email}`);
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Request-Parameter validieren
    const { einheitId, targetEmail, newRole } = await req.json();

    if (!einheitId || !targetEmail || !newRole) {
      console.warn(`[addEinheitMemberSecure] Missing parameters from ${user.email}`);
      return Response.json(
        { error: 'Missing required parameters: einheitId, targetEmail, newRole' },
        { status: 400 }
      );
    }

    // 3. Role ist valid
    if (!VALID_ROLES.includes(newRole)) {
      console.warn(
        `[addEinheitMemberSecure] Invalid role ${newRole} from ${user.email}`
      );
      return Response.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Einheit existiert
    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({
      id: einheitId
    });
    const einheit = einheiten[0];

    if (!einheit) {
      console.warn(
        `[addEinheitMemberSecure] Einheit ${einheitId} not found (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Einheit not found' },
        { status: 404 }
      );
    }

    // 5. Benutzer-Profil laden (Current User)
    // ✅ WICHTIG: Base44-Admin-Rolle priorisieren (authUser.role kommt von Base44-Auth)
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    
    // ✅ Admin-Rolle von Base44-Auth übernehmen, auch wenn kein Benutzer-Profil existiert
    const istBase44Admin = user.role === 'Administrator' || user.role === 'admin';
    const rolle = istBase44Admin ? 'Administrator' : (profil?.rolle || 'Betrachter');
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // 6. Delegierte Berechtigung prüfen (Current User)
    const myMembership = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: user.email
    });
    const delegatedMembership = myMembership[0];

    // 7. Berechtigung validieren
    const authCheck = canUserAddMembers(rolle, faecher, einheit.fach, delegatedMembership);

    if (!authCheck.allowed) {
      console.warn(
        `[addEinheitMemberSecure] DENIED - ${user.email} (role: ${rolle}, delegated: ${delegatedMembership?.unit_role || 'none'}) ` +
        `tried to add member to ${einheitId} (${einheit.fach}). Reason: ${authCheck.reason}`
      );

      // Audit-Log für BLOCKED Attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'EinheitMembers',
          resource_id: einheitId,
          changes: {
            attempt: 'add_member',
            targetEmail: targetEmail,
            requestedRole: newRole
          },
          affected_count: 0,
          status: 'failed',
          error_message: `Permission denied: ${authCheck.reason}`
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
            delegatedRole: delegatedMembership?.unit_role || null
          }
        },
        { status: 403 }
      );
    }

    // 8. Target User existiert
    const targetUsers = await base44.asServiceRole.entities.User.filter({
      email: targetEmail
    });

    if (targetUsers.length === 0) {
      console.warn(
        `[addEinheitMemberSecure] Target user ${targetEmail} not found (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    const targetUser = targetUsers[0];

    // 9. Existierende Membership prüfen
    const existingMembers = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: targetEmail
    });

    let operation = 'created';
    let membershipId = null;

    if (existingMembers.length > 0) {
      // Update existierenden Member
      const existingMember = existingMembers[0];
      membershipId = existingMember.id;
      operation = 'updated';

      // Nur updaten, wenn Rolle unterschiedlich ist
      if (existingMember.unit_role !== newRole) {
        await base44.asServiceRole.entities.EinheitMembers.update(membershipId, {
          unit_role: newRole
        });
      }
    } else {
      // Neuen Member erstellen
      const newMember = await base44.asServiceRole.entities.EinheitMembers.create({
        einheit_id: einheitId,
        user_email: targetEmail,
        user_name: targetUser.full_name || targetEmail,
        unit_role: newRole
      });
      membershipId = newMember.id;
    }

    // 10. ✅ Audit-Log schreiben (SUCCESS)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'EinheitMembers',
        resource_id: einheitId,
        changes: {
          targetUser: targetEmail,
          role: newRole,
          operation: operation,
          grantedBy: authCheck.reason,
          membershipId: membershipId
        },
        affected_count: 1,
        status: 'success'
      });
    } catch (auditErr) {
      console.error('[addEinheitMemberSecure] Failed to write audit log:', auditErr);
      // Audit failure sollte nicht die Mutation blockieren, aber logged werden
    }

    console.info(
      `[addEinheitMemberSecure] SUCCESS - ${user.email} ${operation} member ${targetEmail} ` +
      `to ${einheitId} with role ${newRole} (grantedBy: ${authCheck.reason})`
    );

    return Response.json({
      success: true,
      message: `Member ${targetEmail} successfully ${operation} with role ${newRole}`,
      membershipId,
      operation,
      grantedBy: authCheck.reason
    });

  } catch (error) {
    console.error('[addEinheitMemberSecure] Unexpected error:', error);

    return Response.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      { status: 500 }
    );
  }
});