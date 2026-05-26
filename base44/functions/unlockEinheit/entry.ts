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
    const { einheitId } = body;

    if (!einheitId) {
      return Response.json({ error: 'Missing einheitId' }, { status: 400 });
    }

    // Hole die aktuelle Einheit
    const einheit = await base44.entities.Einheiten.get(einheitId);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Nur der aktuelle Lock-Holder darf entsperren (Admin kann immer)
    const isLockHolder = einheit.structural_lock === user.email;
    const isAdmin = user.role === 'admin';
    
    if (!isLockHolder && !isAdmin) {
      return Response.json(
        { error: 'You do not hold the lock' },
        { status: 403 }
      );
    }

    // Re-Read gegen TOCTOU: Nur entsperren, wenn derselbe Lock noch aktiv ist.
    const latestEinheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    if (!latestEinheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    if (
      latestEinheit.structural_lock !== einheit.structural_lock ||
      latestEinheit.structural_locked_at !== einheit.structural_locked_at
    ) {
      return Response.json(
        { error: 'Lock changed meanwhile. Please reload.', code: 'LOCK_CHANGED' },
        { status: 409 }
      );
    }

    // Entferne Structural Lock + version-Bump (OCC-Signal).
    // @MIGRATION_NOTE (Supabase): Inkrement wandert in einen BEFORE-UPDATE-Trigger.
    const currentEinheitVersion = Number.isFinite(latestEinheit?.version) ? latestEinheit.version : 1;
    await base44.entities.Einheiten.update(einheitId, {
      structural_lock: null,
      structural_locked_at: null,
      version: currentEinheitVersion + 1,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[unlockEinheit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});