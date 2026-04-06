import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { isEqual } from 'npm:lodash-es@4.17.21';

/**
 * Entity-Automation Handler: sync_status Change-Tracking
 *
 * Wird bei UPDATE-Events auf Einheiten, Lernpakete, Lernziele, Aufgabenbausteine ausgelöst.
 * 
 * Architektur & Sicherheit:
 * - Respektiert explizite Statusänderungen (z.B. to_delete)
 * - Isoliert Klone (is_master=false) vom Moodle-Sync-Tracking
 * - Ignoriert reine Systemmetadaten (Lock, Sync-Timestamps)
 * - Nur aktiv wenn vorheriger Status 'exported' war
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    const { event, data, old_data } = payload;

    // ───────────────────────────────────────────────────────────────────
    // 1. Nur UPDATE-Events verarbeiten
    // ───────────────────────────────────────────────────────────────────
    if (event?.type !== 'update') {
      return Response.json({ ok: true, skipped: 'not an update event' });
    }

    const entityName = event.entity_name;
    const entityId = event.entity_id;

    // ───────────────────────────────────────────────────────────────────
    // 2. Schutz vor Überschreiben expliziter Statusänderungen
    // ───────────────────────────────────────────────────────────────────
    // Wenn sync_status bewusst im Update gesetzt wird und nicht 'exported' ist,
    // respektiere diesen neuen Status (z.B. to_delete, pending_export)
    if (data?.sync_status && data.sync_status !== 'exported') {
      return Response.json({
        ok: true,
        skipped: 'sync_status explicitly changed in this update',
        explicit_status: data.sync_status,
      });
    }

    // ───────────────────────────────────────────────────────────────────
    // 3. Klon-Isolierung (nur für Aufgabenbausteine)
    // ───────────────────────────────────────────────────────────────────
    if (entityName === 'Aufgabenbausteine') {
      const isMaster = data?.is_master ?? old_data?.is_master;
      if (isMaster === false) {
        return Response.json({
          ok: true,
          skipped: 'klone are excluded from sync tracking',
        });
      }
    }

    // ───────────────────────────────────────────────────────────────────
    // 4. Nur aktiv wenn sync_status vorher 'exported' war
    // ───────────────────────────────────────────────────────────────────
    if (old_data?.sync_status !== 'exported') {
      return Response.json({
        ok: true,
        skipped: 'not exported status',
        current_status: old_data?.sync_status,
      });
    }

    // ───────────────────────────────────────────────────────────────────
    // 5. Ignorierte Felder: Systemmetadaten, Lock, Sync-Timestamps
    // ───────────────────────────────────────────────────────────────────
    const ignoredFields = new Set([
      // Lock-Felder (Task & Paket)
      'lock_status',
      'locked_by_user',
      'locked_at',
      'is_locked',
      'locked_by_email',
      // Einheiten-Structural-Lock
      'structural_lock',
      'structural_locked_at',
      // Systemmetadaten
      'updated_date',
      'created_date',
      'updated_at',
      'created_at',
      // Moodle-Sync-Metadaten
      'last_synced_at',
      'moodle_id',
      'moodle_url',
      'moodle_resource_id',
      'sync_error_message',
      'payload_too_large',
    ]);

    const changedFields = Object.keys(data || {}).filter(k => {
      if (ignoredFields.has(k)) return false;
      if (k === 'sync_status') return false; // sync_status ist hier irrelevant
      return !isEqual(data[k], old_data?.[k]);
    });

    if (changedFields.length === 0) {
      return Response.json({
        ok: true,
        skipped: 'only system fields changed (lock, timestamps, etc.)',
      });
    }

    // ───────────────────────────────────────────────────────────────────
    // 6. Entity-Mapping und Update durchführen
    // ───────────────────────────────────────────────────────────────────
    const entityMap = {
      Einheiten: base44.asServiceRole.entities.Einheiten,
      Lernpakete: base44.asServiceRole.entities.Lernpakete,
      Lernziele: base44.asServiceRole.entities.Lernziele,
      Aufgabenbausteine: base44.asServiceRole.entities.Aufgabenbausteine,
    };

    const entity = entityMap[entityName];
    if (!entity) {
      return Response.json({ ok: true, skipped: 'entity type not tracked' });
    }

    // Update zu 'modified', da echte inhaltliche Änderung erkannt wurde
    await entity.update(entityId, { sync_status: 'modified' });

    return Response.json({
      ok: true,
      updated: entityName,
      id: entityId,
      changedFields,
      newSyncStatus: 'modified',
    });
  } catch (error) {
    console.error('[syncStatusTracker] Error:', error);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
});