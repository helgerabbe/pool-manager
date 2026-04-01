/**
 * updateEinheitSecure.js
 * 
 * Phase 6.3: Sichere UPDATE Operation für Einheiten mit:
 * - RBAC Validation
 * - Input Validation
 * - Audit Logging
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
    const { einheit_id, titel_der_einheit, gesamtziel, fach, jahrgangsstufe, freigabe_status } = payload;

    if (!einheit_id) {
      return Response.json({ error: 'einheit_id is required' }, { status: 400 });
    }

    // 3. Fetch existing Einheit
    const existingEinheit = await base44.asServiceRole.entities.Einheiten.get(einheit_id);
    if (!existingEinheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. Input Validation - Only validate if provided
    if (titel_der_einheit !== undefined && !titel_der_einheit?.trim()) {
      return Response.json({ error: 'titel_der_einheit cannot be empty' }, { status: 400 });
    }
    if (fach !== undefined && !fach?.trim()) {
      return Response.json({ error: 'fach cannot be empty' }, { status: 400 });
    }
    if (jahrgangsstufe !== undefined && !jahrgangsstufe?.toString().trim()) {
      return Response.json({ error: 'jahrgangsstufe cannot be empty' }, { status: 400 });
    }

    // 5. RBAC Check - Owner or specific roles can update
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    
    const benutzer = benutzerList?.[0];
    const role = benutzer?.rolle;
    const targetFach = fach || existingEinheit.fach;

    let allowed = false;
    let rbacReason = '';

    if (role === 'Administrator') {
      allowed = true;
    } else if (role === 'Fachschaftsleitung') {
      // Can only update units for their subject
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(targetFach)) {
        allowed = true;
      } else {
        rbacReason = `Cannot update unit for subject: ${targetFach}. You are responsible for: ${subjects.join(', ') || 'no subjects'}`;
      }
    } else if (role === 'Fachlehrkraft') {
      // Check if user is LEITUNG of this unit
      const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: einheit_id,
        user_email: user.email,
      });
      if (membership?.[0]?.unit_role === 'LEITUNG') {
        allowed = true;
      } else {
        rbacReason = 'Must be unit lead to update this unit';
      }
    } else {
      rbacReason = `Role ${role} cannot update units`;
    }

    if (!allowed) {
      // Log failed attempt
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'Einheiten',
          resource_id: einheit_id,
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

    // 6. Build update data - only include provided fields
    const updateData = {};
    if (titel_der_einheit !== undefined) updateData.titel_der_einheit = titel_der_einheit;
    if (gesamtziel !== undefined) updateData.gesamtziel = gesamtziel;
    if (fach !== undefined) updateData.fach = fach;
    if (jahrgangsstufe !== undefined) updateData.jahrgangsstufe = jahrgangsstufe;
    if (freigabe_status !== undefined) updateData.freigabe_status = freigabe_status;

    // 7. Update Einheit
    const updatedEinheit = await base44.entities.Einheiten.update(einheit_id, updateData);

    // 8. Log Success
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheit_id,
        changes: updateData,
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
        message: 'Einheit updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[UPDATE_EINHEIT_ERROR]', error);

    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});