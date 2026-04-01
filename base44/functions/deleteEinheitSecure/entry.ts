/**
 * deleteEinheitSecure.js
 * 
 * Phase 6.2: Sichere DELETE Operation für Einheiten mit:
 * - RBAC Validation
 * - Cascade Delete (Themenfelder, Lernpakete, Lernziele, Aufgabenbausteine)
 * - Audit Logging
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Cascade Delete Helper - Recursively delete entity and its children
 */
async function cascadeDelete(base44, entityName, id, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    console.warn(`Cascade delete depth limit reached for ${entityName}:${id}`);
    return 0;
  }

  const dependencyMap = {
    Einheiten: [
      { entity: 'Themenfeld', fk: 'einheit_id' },
      { entity: 'Lernpakete', fk: 'einheit_id' },
      { entity: 'EinheitMembers', fk: 'einheit_id' },
    ],
    Themenfeld: [
      { entity: 'Lernpakete', fk: 'themenfeld_id' },
    ],
    Lernpakete: [
      { entity: 'Lernziele', fk: 'lernpaket_id' },
      { entity: 'Aufgabenbausteine', fk: 'lernpaket_id' },
      { entity: 'LernpaketAktivitaet', fk: 'lernpaket_id' },
    ],
    Lernziele: [],
    Aufgabenbausteine: [
      { entity: 'MappingAufgabeBasisziel', fk: 'aufgabe_id' },
    ],
  };

  let totalDeleted = 1;
  const dependencies = dependencyMap[entityName] || [];

  try {
    // Delete all children first
    for (const dep of dependencies) {
      const children = await base44.asServiceRole.entities[dep.entity].filter({
        [dep.fk]: id,
      });

      for (const child of children) {
        const childCount = await cascadeDelete(base44, dep.entity, child.id, maxDepth, currentDepth + 1);
        totalDeleted += childCount;
      }
    }

    // Delete the entity itself
    await base44.asServiceRole.entities[entityName].delete(id);
    return totalDeleted;
  } catch (error) {
    console.error(`Cascade delete error for ${entityName}:${id}`, error);
    throw error;
  }
}

/**
 * Main Handler
 */
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

    // 2. Parse ID from payload (invoked via base44.functions.invoke)
    const payload = await req.json();
    const einheitId = payload?.einheit_id;

    if (!einheitId) {
      return Response.json({ error: 'Missing einheit_id in payload' }, { status: 400 });
    }

    // 3. Fetch target entity
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // 4. RBAC Check (CRITICAL) - Check user role and permissions
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    
    const benutzer = benutzerList?.[0];
    const role = benutzer?.rolle;
    
    // Simple RBAC: Administrator always allowed, Fachlehrkraft only if unit lead
    let allowed = false;
    let rbacReason = '';
    
    if (role === 'Administrator') {
      allowed = true;
    } else if (role === 'Fachschaftsleitung') {
      // Check if responsible for this subject
      const subjects = benutzer?.fachbereich_zustaendigkeit || [];
      if (subjects.includes(einheit.fach)) {
        allowed = true;
      } else {
        rbacReason = `Not responsible for subject: ${einheit.fach}`;
      }
    } else if (role === 'Fachlehrkraft') {
      // Check if user is LEITUNG of this unit
      const membership = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: einheitId,
        user_email: user.email,
      });
      if (membership?.[0]?.unit_role === 'LEITUNG') {
        allowed = true;
      } else {
        rbacReason = 'Must be unit lead to delete';
      }
    } else {
      rbacReason = `Role ${role} cannot delete`;
    }
    
    const rbacCheck = { allowed, reason: rbacReason };
    if (!rbacCheck.allowed) {
      // Log failed attempt to AuditLog
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          user_email: user.email,
          action: 'DELETE',
          resource_type: 'Einheiten',
          resource_id: einheitId,
          status: 'failed',
          error_message: rbacCheck.reason || 'Permission denied',
        });
      } catch (logError) {
        console.error('Audit log error:', logError.message);
      }

      return Response.json(
        { error: rbacCheck.reason || 'Permission denied' },
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 5. Cascade Delete
    const deletedCount = await cascadeDelete(base44, 'Einheiten', einheitId);

    // 6. Log Success to AuditLog
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'DELETE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        affected_count: deletedCount,
        status: 'success',
      });
    } catch (logError) {
      console.error('Audit log error:', logError.message);
    }

    // 7. Return Success
    return Response.json(
      {
        success: true,
        deleted_count: deletedCount,
        message: `Einheit and ${deletedCount - 1} related records deleted`,
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
    console.error('[DELETE_EINHEIT_ERROR]', error);

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