/**
 * publishEinheitSecure.js
 * 
 * Phase 6.3: Sichere PUBLISH Operation für Einheiten Status-Änderung mit:
 * - RBAC Validation (nur Admin + Fachschaftsleitung können publishen)
 * - Status-Transition (In Planung → Freigegeben für Moodle)
 * - Audit Logging (action: "PUBLISH")
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Main Handler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload = await req.json();
    const { id: einheitId, status: targetStatus } = payload;

    if (!einheitId) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    // 3. Fetch existing Einheit
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. RBAC Check - Only Admin and Fachschaftsleitung can publish
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    
    const benutzer = benutzerList?.[0];
    const role = benutzer?.rolle;

    let allowed = false;
    let rbacReason = '';

    if (role === 'Administrator') {
      // Admin can publish any unit
      allowed = true;
    } else if (role === 'Fachschaftsleitung') {
      // Fachschaftsleitung can only publish for their subjects
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(einheit.fach)) {
        allowed = true;
      } else {
        rbacReason = `Cannot publish unit for subject: ${einheit.fach}. You are responsible for: ${subjects.join(', ') || 'no subjects'}`;
      }
    } else {
      rbacReason = `Role ${role} cannot publish units. Only Administrator and Fachschaftsleitung are allowed.`;
    }

    if (!allowed) {
      // Log failed attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'PUBLISH',
          resource_type: 'Einheiten',
          resource_id: einheitId,
          status: 'failed',
          error_message: rbacReason || 'Permission denied',
        });
      } catch (logError) {
        console.error('Audit log error:', logError.message);
      }

      return Response.json(
        { error: rbacReason || 'Permission denied' },
        { status: 403 }
      );
    }

    // 5. Validate target status
    const validStatuses = ['In Planung', 'Freigegeben für Moodle'];
    const newStatus = targetStatus || 'Freigegeben für Moodle';
    
    if (!validStatuses.includes(newStatus)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 6. Check status transition logic
    if (einheit.freigabe_status === newStatus) {
      return Response.json(
        { error: `Einheit is already in status: ${newStatus}` },
        { status: 400 }
      );
    }

    // 7. Update Einheit status
    const updatedEinheit = await base44.entities.Einheiten.update(einheitId, {
      freigabe_status: newStatus,
    });

    // 8. Log Success
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'PUBLISH',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: {
          freigabe_status_old: einheit.freigabe_status,
          freigabe_status_new: newStatus,
        },
        status: 'success',
      });
    } catch (logError) {
      console.error('Audit log error:', logError.message);
    }

    // 9. Return Success
    return Response.json(
      {
        success: true,
        data: updatedEinheit,
        message: `Einheit status changed to "${newStatus}"`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PUBLISH_EINHEIT_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});