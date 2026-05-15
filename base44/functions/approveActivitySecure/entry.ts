/**
 * approveActivitySecure.js
 * 
 * Sichere Backend-Funktion zum Freigeben/Zurückziehen von Aktivitäten.
 * 
 * Validiert:
 * 1. Current User hat Berechtigung (Global Admin/Fachschaft ODER Delegierte LEITUNG)
 * 2. Einheit-Scope wird validiert (Scope-Leak Prevention)
 * 3. Aktivität existiert und gehört zur angegebenen Einheit
 * 4. Cascade zu Master-Aufgaben/Klonen wird durchgeführt
 * 5. Audit-Log wird geschrieben
 * 
 * Parameter:
 * - entityId: LernpaketPhaseAktivitaet ID
 * - action: 'approve' | 'unapprove'
 * - einheitId: Einheit ID (für Scope-Validierung)
 *
 * @MIGRATION_NOTE Supabase:
 * - Der Cascade von Aktivität → MasterAufgabe → Aufgabenbausteine darf später
 *   nicht mehr als N+1-Schleife im Backend laufen. Stattdessen: Postgres Trigger
 *   AFTER UPDATE OF content_status ON lernpaket_phase_aktivitaet, der alle
 *   abhängigen Datensätze atomar in einer Transaktion aktualisiert.
 * - Für Base44 werden explizite hohe Limits gesetzt; in Supabase über Indexe
 *   und set-basierte UPDATEs lösen.
 * 
 * Rückgabe: { success: boolean, entityId, newStatus, grantedBy }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Konstanten
const VALID_ACTIONS = ['approve', 'unapprove'];

// ✅ Rate-Limiter: In-Memory Tracking mit Timestamps + Cleanup
const requestLog = new Map();
const CLEANUP_EVERY_N_REQUESTS = 500;
const CLEANUP_MAX_MAP_SIZE = 5000;
const DEFAULT_ENTRY_TTL_MS = 5 * 60 * 1000;
let requestCounter = 0;

function maybeRunCleanup() {
  requestCounter += 1;
  if (requestCounter < CLEANUP_EVERY_N_REQUESTS && requestLog.size < CLEANUP_MAX_MAP_SIZE) return;

  requestCounter = 0;
  const now = Date.now();
  for (const [key, timestamps] of requestLog.entries()) {
    const validTimestamps = timestamps.filter((ts) => now - ts < DEFAULT_ENTRY_TTL_MS);
    if (validTimestamps.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, validTimestamps);
    }
  }
}

function isRateLimited(userEmail, functionName, maxRequests = 20, windowMs = 60000) {
  const key = `${userEmail}::${functionName}`;
  const now = Date.now();
  const timestamps = requestLog.get(key) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    requestLog.set(key, validTimestamps);
    maybeRunCleanup();
    return true; // Limit überschritten
  }
  
  validTimestamps.push(now);
  requestLog.set(key, validTimestamps);
  maybeRunCleanup();
  return false;
}

/**
 * Prüft, ob ein User eine Aktivität freigeben darf.
 * Berücksichtigt globale Rollen UND delegierte Berechtigungen.
 */
function validateApprovalPermissionWithScope(
  rolle,
  faecher,
  targetFach,
  einheitId,
  delegatedMembership,
  action
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

  // FACHLEHRKRAFT: NIEMALS global freigeben, aber mit delegierter LEITUNG OK
  if (rolle === 'Fachlehrkraft') {
    // Ohne delegierte LEITUNG: nicht erlaubt
    if (!delegatedMembership) {
      return { allowed: false, reason: 'lehrkraft_no_delegation' };
    }

    // Mit delegierter LEITUNG dieser Einheit: OK
    if (delegatedMembership.unit_role === 'LEITUNG') {
      return { allowed: true, reason: 'lehrkraft_delegated_leitung' };
    }

    // Mit delegierter EDITOR/READER: keine Publikations-Aktionen
    if (action === 'approve' || action === 'unapprove') {
      return { allowed: false, reason: 'lehrkraft_no_publish_permission' };
    }

    // Für reine Bearbeitung: delegierte Berechtigung für diese Einheit reicht
    return { allowed: true, reason: 'lehrkraft_delegated_edit' };
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
      console.warn('[approveActivitySecure] Unauthorized access attempt');
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Rate-Limiting: 20 Requests pro Minute pro User
    if (isRateLimited(user.email, 'approveActivitySecure', 20, 60000)) {
      console.warn(`[approveActivitySecure] Rate limit exceeded for ${user.email}`);
      return Response.json(
        { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Request-Parameter validieren
    const { 
      entityId, 
      action = 'approve', 
      einheitId, 
      delegatedRole  // Nur zu Info-Zwecken
    } = await req.json();

    if (!entityId || !einheitId) {
      console.warn(
        `[approveActivitySecure] Missing parameters from ${user.email}: ` +
        `entityId=${entityId}, einheitId=${einheitId}`
      );
      return Response.json(
        {
          error: 'Missing required parameters: entityId, einheitId'
        },
        { status: 400 }
      );
    }

    // 3. Action ist valid
    if (!VALID_ACTIONS.includes(action)) {
      console.warn(
        `[approveActivitySecure] Invalid action ${action} from ${user.email}`
      );
      return Response.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Einheit existiert und gehört zu einheitId
    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({
      id: einheitId
    });
    const einheit = einheiten[0];

    if (!einheit) {
      console.warn(
        `[approveActivitySecure] Einheit ${einheitId} not found (requested by ${user.email})`
      );
      return Response.json(
        { error: 'Einheit not found' },
        { status: 404 }
      );
    }

    const targetFach = einheit.fach;

    // 5. Aktivität existiert
    const aktivitaeten = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
      id: entityId
    });
    const aktivitaet = aktivitaeten[0];

    if (!aktivitaet) {
      console.warn(
        `[approveActivitySecure] Aktivität ${entityId} not found (requested by ${user.email})`
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
        `[approveActivitySecure] DENIED - ${user.email} tried to approve but lock is held by ${aktivitaet.locked_by_user}`
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

    // 6. Benutzer-Profil laden (Current User)
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    // 7. Delegierte Berechtigung prüfen (Current User für diese Einheit)
    const myMembership = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheitId,
      user_email: user.email
    });
    const delegatedMembership = myMembership[0];

    // 8. Berechtigung validieren mit Scope
    const authCheck = validateApprovalPermissionWithScope(
      rolle,
      faecher,
      einheit.fach,
      einheitId,
      delegatedMembership,
      action
    );

    if (!authCheck.allowed) {
      console.warn(
        `[approveActivitySecure] DENIED - ${user.email} (role: ${rolle}, delegated: ${delegatedMembership?.unit_role || 'none'}) ` +
        `tried to ${action} ${entityId} in ${einheitId}. Reason: ${authCheck.reason}`
      );

      // Audit-Log für BLOCKED Attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'PUBLISH',
          resource_type: 'LernpaketPhaseAktivitaet',
          resource_id: entityId,
          changes: {
            attempt: action,
            einheitId: einheitId,
            targetFach: targetFach
          },
          affected_count: 0,
          status: 'failed',
          error_message: `Permission denied: ${authCheck.reason}`
        });
      } catch (auditErr) {
        console.error('[approveActivitySecure] Failed to write audit log:', auditErr);
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

    // 9. ✅ Berechtigung OK: Status setzen
    const newStatus = action === 'approve' ? 'approved' : 'draft';

    // ✅ NEU: Bei Freigabe (approve) → Standardwerte für leere Felder befüllen
    let updateData = {
      content_status: newStatus
    };

    if (action === 'approve') {
      // Laden der Aktivität aus dem Katalog um die Schema-Felder zu sehen
      const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.filter({
        id: aktivitaet.aktivitaet_id
      });
      const katalogEntry = katalog[0];

      if (katalogEntry && katalogEntry.form_schema && Array.isArray(katalogEntry.form_schema)) {
        const currentValues = aktivitaet.field_values || {};
        const filledValues = { ...currentValues };

        // Durchlaufe alle Schema-Felder und befülle leere mit Standardwerten
        for (const field of katalogEntry.form_schema) {
          const fieldName = field.field_name;
          const isEmpty = !filledValues[fieldName] || 
                         (Array.isArray(filledValues[fieldName]) && filledValues[fieldName].length === 0);

          if (isEmpty && field.required) {
            // Standardwert basierend auf Feldtyp
            switch (field.type) {
              case 'text':
              case 'textarea':
              case 'url':
                filledValues[fieldName] = `[${field.label}: Wird noch ausgefüllt]`;
                break;
              case 'number':
                filledValues[fieldName] = 0;
                break;
              case 'select':
                // Nutze erste Option oder Leer-String
                filledValues[fieldName] = field.options?.[0]?.value || '';
                break;
              case 'json':
                filledValues[fieldName] = [];
                break;
              default:
                filledValues[fieldName] = '';
            }
          }
        }

        updateData.field_values = filledValues;
      }
    }

    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(entityId, updateData);

    // 10. Cascade: Alle Master-Aufgaben + Klone aktualisieren
    let cascadeErrors = [];
    let cascadeCount = 0;

    try {
      const masterAufgaben = await base44.asServiceRole.entities.MasterAufgabe.filter({
        activity_id: entityId
      }, undefined, 1000);

      for (const master of masterAufgaben) {
        try {
          // Update Master
          await base44.asServiceRole.entities.MasterAufgabe.update(master.id, {
            content_status: newStatus
          });
          cascadeCount++;

          // Update alle Klone dieses Masters
          const klone = await base44.asServiceRole.entities.Aufgabenbausteine.filter({
            master_aufgabe_id: master.id
          }, undefined, 1000);

          for (const klon of klone) {
            try {
              await base44.asServiceRole.entities.Aufgabenbausteine.update(klon.id, {
                content_status: newStatus
              });
              cascadeCount++;
            } catch (klonErr) {
              cascadeErrors.push(`Klon ${klon.id}: ${klonErr.message}`);
            }
          }
        } catch (masterErr) {
          cascadeErrors.push(`Master ${master.id}: ${masterErr.message}`);
        }
      }
    } catch (cascadeErr) {
      console.error('[approveActivitySecure] Cascade error:', cascadeErr);
      cascadeErrors.push(`Cascade failed: ${cascadeErr.message}`);
    }

    // 11. ✅ Audit-Log schreiben (SUCCESS)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: action === 'approve' ? 'PUBLISH' : 'UNPUBLISH',
        resource_type: 'LernpaketPhaseAktivitaet',
        resource_id: entityId,
        changes: {
          content_status: { from: aktivitaet.content_status, to: newStatus },
          einheitId: einheitId,
          targetFach: targetFach,
          grantedBy: authCheck.reason,
          delegatedRole: delegatedMembership?.unit_role || null,
          cascadeCount: cascadeCount,
          cascadeErrors: cascadeErrors.length > 0 ? cascadeErrors : null
        },
        affected_count: 1 + cascadeCount,
        status: cascadeErrors.length === 0 ? 'success' : 'partial_success'
      });
    } catch (auditErr) {
      console.error('[approveActivitySecure] Failed to write audit log:', auditErr);
    }

    console.info(
      `[approveActivitySecure] SUCCESS - ${user.email} ${action}d ${entityId} ` +
      `(Einheit: ${einheitId}, Cascade: ${cascadeCount} records, ` +
      `grantedBy: ${authCheck.reason})`
    );

    // Response
    const response = {
      success: true,
      message: `Aktivität successfully ${action === 'approve' ? 'approved' : 'unapproved'}`,
      entityId,
      einheitId,
      newStatus,
      grantedBy: authCheck.reason,
      cascade: {
        count: cascadeCount,
        errors: cascadeErrors.length > 0 ? cascadeErrors : null
      }
    };

    if (cascadeErrors.length > 0) {
      response.message += ` (with ${cascadeErrors.length} cascade errors)`;
    }

    return Response.json(response);

  } catch (error) {
    console.error('[approveActivitySecure] Unexpected error:', error);

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