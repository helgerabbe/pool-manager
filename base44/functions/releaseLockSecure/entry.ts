import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { entityName, entityId } = body;

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

    const einheit = await base44.entities.Einheiten.get(entityId).catch(() => null);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const isAdmin = user.role === 'admin' || profile?.[0]?.rolle === 'Administrator';
    const isLockOwner = einheit.structural_lock === user.email;

    if (einheit.structural_lock && !isLockOwner && !isAdmin) {
      return Response.json(
        {
          error: `Sie haben diesen Lock nicht. Lock-Besitzer: ${einheit.structural_lock}`,
          locked_by_email: einheit.structural_lock,
          code: 'NOT_LOCK_OWNER',
        },
        { status: 403 }
      );
    }

    const latestEinheit = await base44.entities.Einheiten.get(entityId).catch(() => null);
    if (!latestEinheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Self-Lockout-Fix 2026-06-10: KEIN Timestamp-Vergleich mehr (analog
    // releaseLernpaketLockSecure). Maßgeblich ist allein: Hat jemand ANDERES
    // den Lock zwischenzeitlich übernommen? Wenn nicht (ich bin noch Owner
    // oder der Lock ist schon frei), darf ich freigeben — sonst bliebe der
    // eigene Bearbeitungsmodus dauerhaft hängen.
    const lockTakenByOther =
      latestEinheit.structural_lock &&
      latestEinheit.structural_lock !== user.email &&
      !isAdmin;
    if (lockTakenByOther) {
      return Response.json(
        { error: 'Der Lock wurde zwischenzeitlich von einer anderen Person übernommen.', code: 'LOCK_CHANGED' },
        { status: 409 }
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