import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * validateLockSecure
 * 
 * Validiert, ob ein Lock auf einer Entity noch gültig ist.
 * Wird vom Heartbeat aufgerufen, um zu prüfen, ob der Lock noch besteht.
 * 
 * Payload:
 * - entityName: "Lernpakete" (derzeit nur Lernpakete)
 * - entityId: ID der Entity
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { entityName, entityId } = payload;

    if (!entityName || !entityId) {
      return Response.json({ error: 'Missing entityName or entityId' }, { status: 400 });
    }

    // Nur Lernpakete unterstützen hierarchisches Locking
    if (entityName !== 'Lernpakete') {
      return Response.json({ error: 'Entity type not supported for lock validation' }, { status: 400 });
    }

    const entity = await base44.asServiceRole.entities.Lernpakete.get(entityId);
    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Prüfe Lock: ist noch vorhanden und nicht abgelaufen?
    const lockExists = entity.lock_status === true && entity.locked_by_user === user.email;
    const lockExpired = entity.locked_at ? isLockExpired(new Date(entity.locked_at)) : false;

    const still_locked = lockExists && !lockExpired;

    return Response.json({
      success: true,
      still_locked,
      entity_id: entityId,
      locked_by_user: entity.locked_by_user || null,
      locked_at: entity.locked_at || null,
    });
  } catch (error) {
    console.error('[validateLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function isLockExpired(lockedAt) {
  const now = new Date();
  const lockAgeSeconds = (now - lockedAt) / 1000;
  return lockAgeSeconds > 1800; // 30 Minuten Timeout
}