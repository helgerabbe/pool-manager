import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * forceReleaseLockAdmin
 *
 * Generische Admin-Funktion: Entsperrt Entities erzwungenermaßen.
 * Jeder erfolgreiche Eingriff wird revisionssicher im AuditLog protokolliert.
 *
 * Hinweis: AuditLog.action erlaubt aktuell nur feste Enum-Werte. Der konkrete
 * FORCE_UNLOCK-Vorgang wird deshalb in changes.event gespeichert.
 */

const LOCK_FIELD_MAP = {
  Lernpakete: {
    lockField: 'is_locked',
    lockValue: false,
    ownerField: 'locked_by_email',
    timeField: 'locked_at',
  },
  Einheiten: {
    lockField: 'structural_lock',
    lockValue: null,
    ownerField: null,
    ownerSourceField: 'structural_lock',
    timeField: 'structural_locked_at',
  },
  Aufgabenbausteine: {
    lockField: 'lock_status',
    lockValue: false,
    ownerField: 'locked_by_user',
    timeField: 'locked_at',
  },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { entityName, entityId } = body;

    if (!entityName || !entityId) {
      return Response.json({ error: 'entityName and entityId required' }, { status: 400 });
    }

    const config = LOCK_FIELD_MAP[entityName];
    if (!config) {
      return Response.json({ error: `Unsupported entityName: ${entityName}` }, { status: 400 });
    }

    const entityApi = base44.asServiceRole.entities[entityName];
    const entity = await entityApi.get(entityId);
    if (!entity) {
      return Response.json({ error: `${entityName} not found` }, { status: 404 });
    }

    const previousLockOwner = config.ownerField
      ? entity[config.ownerField]
      : entity[config.ownerSourceField || config.lockField];

    const updatePayload = {
      [config.lockField]: config.lockValue,
      [config.timeField]: null,
    };

    if (config.ownerField) {
      updatePayload[config.ownerField] = null;
    }

    if (entityName === 'Einheiten') {
      const currentEinheitVersion = Number.isFinite(entity?.version) ? entity.version : 1;
      updatePayload.version = currentEinheitVersion + 1;
    }

    await entityApi.update(entityId, updatePayload);

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: entityName,
      resource_id: entityId,
      status: 'success',
      affected_count: 1,
      changes: {
        event: 'FORCE_UNLOCK',
        previous_lock_owner: previousLockOwner || 'unknown',
        lock_field: config.lockField,
        owner_field: config.ownerField || config.ownerSourceField || null,
        time_field: config.timeField,
      },
    });

    console.info(
      `[forceReleaseLockAdmin] Released lock for ${entityName}/${entityId} by admin ${user.email}`
    );

    return Response.json({ success: true, message: `Lock released for ${entityName}/${entityId}` });
  } catch (error) {
    console.error('[forceReleaseLockAdmin] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});