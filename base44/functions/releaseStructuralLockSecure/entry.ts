/**
 * releaseStructuralLockSecure.js
 * 
 * Gibt exklusiven Structural Lock frei (Tab 2)
 * - Nur Lock-Holder oder Admin können freigeben
 * - Wird automatisch bei Tab-Wechsel/Unmount aufgerufen
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheit_id } = await req.json();

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // Hole aktuelle Einheit
    const einheit = await base44.entities.Einheiten.get(einheit_id);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Admin kann immer freigeben, andere nur wenn sie den Lock halten
    const istAdmin = user.role === 'admin';
    const istLockHolder = einheit.structural_lock === user.email;

    if (!istAdmin && !istLockHolder) {
      return Response.json(
        { error: 'You do not hold the lock' },
        { status: 403 }
      );
    }

    // Entferne Lock + version-Bump (OCC-Signal für acquireDashboardLockSecure).
    // @MIGRATION_NOTE (Supabase): Inkrement wandert in einen BEFORE-UPDATE-Trigger.
    const currentEinheitVersion = Number.isFinite(einheit?.version) ? einheit.version : 1;
    await base44.entities.Einheiten.update(einheit_id, {
      structural_lock: null,
      structural_locked_at: null,
      version: currentEinheitVersion + 1,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[releaseStructuralLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});