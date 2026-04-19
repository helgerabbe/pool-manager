import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json();

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

    // Entferne Structural Lock
    await base44.entities.Einheiten.update(einheitId, {
      structural_lock: null,
      structural_locked_at: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[unlockEinheit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});