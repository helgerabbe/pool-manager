/**
 * updateEinheitSecure.js
 *
 * Phase 6.4: Optimistic Locking mit Version-Check
 * - Validiert die mitgelieferte `version` gegen die DB-Version
 * - Returns HTTP 409 Conflict wenn Versionen ungleich sind
 * - Inkrementiert Version bei erfolgreicher Änderung
 * - RBAC + Audit Logging
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * HTTP 409 Conflict Error für Versionskonflikte
 */
class VersionConflictError extends Error {
  constructor(currentVersion, providedVersion) {
    super(
      `Version conflict: Expected version ${providedVersion}, but database has version ${currentVersion}`
    );
    this.name = 'VersionConflictError';
    this.status = 409;
    this.currentVersion = currentVersion;
    this.providedVersion = providedVersion;
  }
}

Deno.serve(async (req) => {
  // Allow OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    // 1. Initialize Base44 Client
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = await req.json();
    const {
      einheit_id,
      titel_der_einheit,
      gesamtziele,
      fach,
      jahrgangsstufe,
      zeit_phase_id,
      bearbeitungsmodus,
      freigabe_status,
      grundgeruest_rohtext,
      grundgeruest_strukturiert,
      grundgeruest_status,
      grundgeruest_updated_at,
      version, // CRITICAL: Client-side version für Optimistic Locking
    } = payload;

    if (!einheit_id) {
      return Response.json(
        { error: 'Missing einheit_id in payload' },
        { status: 400 }
      );
    }

    // 3. Fetch Current Entity
    const currentEinheit = await base44.asServiceRole.entities.Einheiten.get(
      einheit_id
    );

    if (!currentEinheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. VERSION CHECK (Optimistic Locking)
    const dbVersion = currentEinheit.version || 1;
    if (version && version !== dbVersion) {
      // Conflict: Client hat eine andere Version als DB
      return Response.json(
        {
          error: 'Version conflict',
          message: `Speicherkonflikt: Ein anderer Nutzer hat diese Daten in der Zwischenzeit geändert. Aktualisieren Sie die Seite.`,
          current_version: dbVersion,
          provided_version: version,
        },
        {
          status: 409,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 5. RBAC Check
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    const benutzer = benutzerList?.[0];
    const role = benutzer?.rolle;

    let allowed = false;
    let rbacReason = '';

    // System-level admin (base44 role) always has full access
    if (user.role === 'admin') {
      allowed = true;
    } else if (role === 'Administrator') {
      allowed = true;
    } else if (role === 'Fachschaftsleitung') {
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(currentEinheit.fach)) {
        allowed = true;
      } else {
        rbacReason = `Not responsible for subject: ${currentEinheit.fach}`;
      }
    } else if (role === 'Fachlehrkraft') {
      const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: einheit_id,
        user_email: user.email,
      });
      if (membership?.[0]?.unit_role === 'LEITUNG') {
        allowed = true;
      } else {
        rbacReason = 'Must be unit lead to update';
      }
    } else {
      rbacReason = `Role ${role} cannot update`;
    }

    if (!allowed) {
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
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 6. Prepare Update Data
    const updateData = {};
    if (titel_der_einheit !== undefined) updateData.titel_der_einheit = titel_der_einheit;
    if (gesamtziele !== undefined) updateData.gesamtziele = gesamtziele;
    if (fach !== undefined) updateData.fach = fach;
    if (jahrgangsstufe !== undefined) updateData.jahrgangsstufe = jahrgangsstufe;
    if (zeit_phase_id !== undefined) updateData.zeit_phase_id = zeit_phase_id;
    if (bearbeitungsmodus !== undefined) updateData.bearbeitungsmodus = bearbeitungsmodus;
    if (freigabe_status !== undefined) updateData.freigabe_status = freigabe_status;
    if (grundgeruest_rohtext !== undefined) updateData.grundgeruest_rohtext = grundgeruest_rohtext;
    if (grundgeruest_strukturiert !== undefined) updateData.grundgeruest_strukturiert = grundgeruest_strukturiert;
    if (grundgeruest_status !== undefined) updateData.grundgeruest_status = grundgeruest_status;
    if (grundgeruest_updated_at !== undefined) updateData.grundgeruest_updated_at = grundgeruest_updated_at;

    console.log('[updateEinheitSecure] Payload:', { einheit_id, updateData, version });

    // 7. INCREMENT VERSION on successful update
    updateData.version = dbVersion + 1;

    // 8. Execute Update
    const updatedEinheit = await base44.asServiceRole.entities.Einheiten.update(
      einheit_id,
      updateData
    );

    // 9. Audit Log Success
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

    // 10. Return Success with new version
    return Response.json(
      {
        success: true,
        data: {
          ...updatedEinheit,
          version: dbVersion + 1, // Return updated version to client
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[UPDATE_EINHEIT_ERROR]', error);

    return Response.json(
      {
        error: error.message || 'Internal server error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
});