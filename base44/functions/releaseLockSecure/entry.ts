import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId } = await req.json();

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

    // Release lock
    await base44.entities.Einheiten.update(entityId, {
      structural_lock: null,
      structural_locked_at: null
    });

    return Response.json({
      success: true,
      entityId,
      releasedBy: user.email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[releaseLockSecure] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});