import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId, lockType } = await req.json();

    if (!entityName || !entityId) {
      return Response.json(
        { error: 'Missing entityName or entityId' },
        { status: 400 }
      );
    }

    if (entityName !== 'Einheiten') {
      return Response.json(
        { error: 'Only Einheiten entity is supported' },
        { status: 400 }
      );
    }

    // Fetch current entity
    const entities = await base44.asServiceRole.entities.Einheiten.filter({
      id: entityId
    });
    const entity = entities[0];

    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Check if already locked by another user
    if (entity.structural_lock && entity.structural_lock !== user.email) {
      return Response.json(
        {
          success: false,
          code: 'STRUCTURAL_LOCK_ACTIVE',
          lockedBy: entity.structural_lock
        },
        { status: 423 }
      );
    }

    // Acquire lock
    await base44.asServiceRole.entities.Einheiten.update(entityId, {
      structural_lock: user.email,
      structural_locked_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      entityId,
      lockedBy: user.email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[acquireLockSecure] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});