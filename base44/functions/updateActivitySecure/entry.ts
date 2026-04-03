/**
 * updateActivitySecure.js
 * 
 * Sichere Backend-Funktion zum Aktualisieren von Aktivitäten-Inhalten.
 * 
 * Validiert:
 * 1. Current User hat Berechtigung (Global Admin/Fachschaft ODER Delegierte LEITUNG/EDITOR)
 * 2. Einheit-Scope wird validiert (Scope-Leak Prevention)
 * 3. Aktivität existiert und gehört zur angegebenen Einheit
 * 4. Audit-Log wird geschrieben
 * 
 * Parameter:
 * - activityId: LernpaketPhaseAktivitaet ID
 * - fieldValues: Die neuen Feldwerte (Objekt)
 * - einheitId: Einheit ID (für Scope-Validierung)
 * - targetFach: Fachbereich (für globale Fachschafts-Validierung)
 * 
 * Rückgabe: { success: boolean, activityId, grantedBy }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ✅ Rate-Limiter: In-Memory Tracking mit Timestamps
const requestLog = new Map();

function isRateLimited(userEmail, functionName, maxRequests = 60, windowMs = 60000) {
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
 * Prüft, ob ein User eine Aktivität bearbeiten darf.
 * Berücksichtigt globale Rollen UND delegierte Berechtigungen.
 */
function validateEditPermissionWithScope(
  rolle,
  faecher,
  targetFach,
  einheitId,
  delegatedMembership
) {
  // ADMIN: immer erlaubt (GLOBAL, alle Einheiten)
  if (rolle === 'Administrator') {
    return { allowed: true, reason: 'admin_global' };
  }

  // FACHSCHAFTSLEITUNG: nur im eigenen Fach (GLOBAL, Fach-scoped)
  if (rolle === 'Fachschaftsleitung') {
    if (!Array.isArray(faecher) || !faecher.includes(targetFach)) {
      return { allowed: false, reason: 'fachschaft_wrong_fach' };
    }
    return { allowed: true, reason: 'fachschaft_fach' };
  }

  // FACHLEHRKRAFT: nur mit delegierter LEITUNG oder EDITOR
  if (rolle === 'Fachlehrkraft') {
    // Ohne delegierte Berechtigung: nicht erlaubt
    if (!delegatedMembership) {
      return { allowed: false, reason: 'lehrkraft_no_delegation' };
    }

    // Mit delegierter LEITUNG oder EDITOR: OK
    if (delegatedMembership.unit_role === 'LEITUNG' || delegatedMembership.unit_role === 'EDITOR') {
      return { allowed: true, reason: `lehrkraft_delegated_${delegatedMembership.unit_role.toLowerCase()}` };
    }

    // Alle anderen delegierten Rollen: nicht erlaubt
    return { allowed: false, reason: 'lehrkraft_insufficient_delegation' };
  }

  // Alle anderen Rollen: nicht erlaubt
  return { allowed: false, reason: 'insufficient_role' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 1. Authentifizierung prüfen
    if (!user) {
      console.warn('[updateActivitySecure] Unauthorized access attempt');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Rate-Limiting: 60 Requests pro Minute pro User (häufiger beim Tippen)
    if (isRateLimited(user.email, 'updateActivitySecure', 60, 60000)) {
      console.warn(`[updateActivitySecure] Rate limit exceeded for ${user.email}`);
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Request-Parameter validieren
    const { 
      activityId, 
      fieldValues = {},
      einheitId, 
      targetFach
    } = await req.json();

    if (!activityId || !einheitId || !targetFach) {
      console.warn(
        `[updateActivitySecure] Missing parameters from ${user.email}: ` +
        `activityId=${activityId}, einheitId=${einheitId}, targetFach=${targetFach}`
      );
      return Response.json(
        {
          error: 'Missing required parameters: activityId, einheitId, targetFach'
        },
        { status: 400 }
      );
    }

    // 3. Einheit existiert und gehört zu einheitId
    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({
      id: einheitId
    });
    const einheit = einheiten[0];

    if (!einheit) {
      console.warn(
        `[updateActivitySecure] Einheit ${einheitId} not found (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Einheit not found' },
        { status: 404 }
      );
    }

    // Scope-Check: targetFach stimmt mit einheit.fach überein
    if (einheit.fach !== targetFach) {
      console.warn(
        `[updateActivitySecure] Scope mismatch: einheit.fach=${einheit.fach}, targetFach=${targetFach} ` +
        `(requested by ${user.email})`
      );
      return Response.json(
        {
          error: 'Scope mismatch: targetFach does not match Einheit fach',
          code: 'SCOPE_MISMATCH'
        },
        { status: 400 }
      );
    }

    // 4. Aktivität existiert
    const aktivitaeten = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
      id: activityId
    });
    const aktivitaet = aktivitaeten[0];

    if (!aktivitaet) {
      console.warn(
        `[updateActivitySecure] Aktivität ${activityId} not found (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Aktivität not found' },
        { status: 404 }
      );
    }

    // ✅ NEU: Pre-Save Lock-Validierung (kritisch für Datenkonsistenz!)
    // Prüfe: Speichert User noch den Lock? (Verhindert Lost Updates)
    if (
      aktivitaet.lock_status &&
      aktivitaet.locked_by_user !== user.email
    ) {
      console.warn(
        `[updateActivitySecure] DENIED - ${user.email} tried to save but lock is held by ${aktivitaet.locked_by_user}`
      );
      return Response.json(
        {
          error: 'Lock no longer held by requesting user',
          code: 'LOCK_NOT_OWNED',
          currentLockOwner: aktivitaet.locked_by_user,
          details: {
            expectedOwner: user.email,
            actualOwner: aktivitaet.locked_by_user,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 409 } // Conflict
      );
    }

    // 5. Benutzer-Profil laden (Current User)
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // 6. Delegierte Berechtigung prüfen (Current User für diese Einheit)
    const myMembership = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: user.email
    });
    const delegatedMembership = myMembership[0];

    // 7. Berechtigung validieren mit Scope (für Edit-Permission)
    const authCheck = validateEditPermissionWithScope(
      rolle,
      faecher,
      targetFach,
      einheitId,
      delegatedMembership
    );

    if (!authCheck.allowed) {
      console.warn(
        `[updateActivitySecure] DENIED - ${user.email} (role: ${rolle}, delegated: ${delegatedMembership?.unit_role || 'none'}) ` +
        `tried to update ${activityId} in ${einheitId}. Reason: ${authCheck.reason}`
      );

      // Audit-Log für BLOCKED Attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'LernpaketPhaseAktivitaet',
          resource_id: activityId,
          changes: {
            attempt: 'update_blocked',
            einheitId: einheitId,
            targetFach: targetFach
          },
          affected_count: 0,
          status: 'failed',
          error_message: `Permission denied: ${authCheck.reason}`
        });
      } catch (auditErr) {
        console.error('[updateActivitySecure] Failed to write audit log:', auditErr);
      }

      return Response.json(
        {
          error: 'Insufficient permissions to perform this action',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            userRole: rolle,
            userFaecher: faecher,
            targetFach: targetFach,
            einheitId: einheitId,
            delegatedRole: delegatedMembership?.unit_role || null,
            validationReason: authCheck.reason
          }
        },
        { status: 403 }
      );
    }

    // 8. ✅ Berechtigung OK: Aktivität aktualisieren
    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, {
      field_values: fieldValues,
      is_complete: true
    });

    // 9. ✅ Audit-Log schreiben (SUCCESS)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'LernpaketPhaseAktivitaet',
        resource_id: activityId,
        changes: {
          field_values: Object.keys(fieldValues),
          einheitId: einheitId,
          targetFach: targetFach,
          grantedBy: authCheck.reason,
          delegatedRole: delegatedMembership?.unit_role || null
        },
        affected_count: 1,
        status: 'success'
      });
    } catch (auditErr) {
      console.error('[updateActivitySecure] Failed to write audit log:', auditErr);
    }

    console.info(
      `[updateActivitySecure] SUCCESS - ${user.email} updated ${activityId} ` +
      `(Einheit: ${einheitId}, grantedBy: ${authCheck.reason})`
    );

    // Response
    return Response.json({
      success: true,
      message: 'Aktivität erfolgreich aktualisiert',
      activityId,
      einheitId,
      grantedBy: authCheck.reason
    });

  } catch (error) {
    console.error('[updateActivitySecure] Unexpected error:', error);

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