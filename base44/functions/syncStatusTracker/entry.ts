import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Entity-Automation Handler: sync_status Change-Tracking
 *
 * Wird bei UPDATE-Events auf Einheiten, Lernpakete, Lernziele, Aufgabenbausteine ausgelöst.
 * Setzt sync_status auf 'modified', wenn er vorher 'exported' war.
 * Ignoriert lock_status-only-Änderungen (kein inhaltlicher Change).
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const { event, data, old_data } = payload;

  if (event?.type !== 'update') {
    return Response.json({ ok: true, skipped: 'not an update event' });
  }

  // Nur aktiv wenn sync_status vorher 'exported' war
  if (old_data?.sync_status !== 'exported') {
    return Response.json({ ok: true, skipped: 'not exported status' });
  }

  // Lock-only-Änderungen ignorieren (lock_status, locked_by_user)
  const ignoredFields = new Set(['lock_status', 'locked_by_user', 'updated_date']);
  const changedFields = Object.keys(data || {}).filter(k => {
    if (ignoredFields.has(k)) return false;
    return JSON.stringify(data[k]) !== JSON.stringify(old_data?.[k]);
  });

  if (changedFields.length === 0) {
    return Response.json({ ok: true, skipped: 'only lock fields changed' });
  }

  const entityName = event.entity_name;
  const entityId   = event.entity_id;

  const entityMap = {
    Einheiten:         base44.asServiceRole.entities.Einheiten,
    Lernpakete:        base44.asServiceRole.entities.Lernpakete,
    Lernziele:         base44.asServiceRole.entities.Lernziele,
    Aufgabenbausteine: base44.asServiceRole.entities.Aufgabenbausteine,
  };

  const entity = entityMap[entityName];
  if (!entity) {
    return Response.json({ ok: true, skipped: 'entity not tracked' });
  }

  await entity.update(entityId, { sync_status: 'modified' });

  return Response.json({ ok: true, updated: entityName, id: entityId });
});