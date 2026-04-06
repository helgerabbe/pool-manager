/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * syncStatusTracker.js
 * 
 * Automation für Moodle-Sync-Status-Verwaltung mit:
 * - Schutz vor Überschreiben expliziter Statusänderungen
 * - Blacklist von Systemfeldern (lock, sync-metadata)
 * - Klon-Isolierung (is_master === false)
 * - Korrekte Statuslogik (nur modified bei echten Content-Änderungen)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json();
    const { event, data, old_data, automation } = payload;

    // ── VALIDIERUNG ─────────────────────────────────────────────────────────────
    if (!event || !event.type || event.type !== 'update') {
      return Response.json({ ok: true, skipped: 'not an update event' });
    }

    const entityName = event.entity_name;
    const entityId = event.entity_id;

    if (!entityName || !entityId) {
      return Response.json({ ok: true, skipped: 'missing entity_name or entity_id' });
    }

    // ── 1. EXPLIZITE STATUSÄNDERUNGEN RESPEKTIEREN ──────────────────────────────
    // Wenn sync_status in diesem Update bewusst geändert wird (z.B. zu_delete, pending),
    // respektiere das und schreibe nicht modified darüber
    if (data?.sync_status && data.sync_status !== 'exported') {
      return Response.json({
        ok: true,
        skipped: 'sync_status explicitly changed in this update',
        action: 'respect_explicit_change',
      });
    }

    // ── 2. KLON-ISOLIERUNG (Aufgabenbausteine) ──────────────────────────────────
    if (entityName === 'Aufgabenbausteine') {
      // Prüfe is_master aus data (aktuelle Werte) oder old_data (vorherige Werte)
      const isMaster = data?.is_master !== undefined ? data.is_master : old_data?.is_master;
      
      if (isMaster === false) {
        return Response.json({
          ok: true,
          skipped: 'klone are excluded from sync tracking',
          reason: 'is_master === false',
        });
      }
    }

    // ── 3. SYSTEMFELDER DEFINIEREN (Blacklist) ──────────────────────────────────
    const ignoredFields = new Set([
      'id',
      'created_date',
      'updated_date',
      'created_by',
      'lock_status',
      'locked_by_user',
      'locked_at',
      'is_locked',
      'locked_by_email',
      'last_synced_at',
      'last_exported_at',
      'moodle_id',
      'moodle_url',
      'moodle_cm_id',
      'sync_timestamp',
      'export_metadata',
      'structural_lock',
      'structural_locked_at',
      'version', // Optimistic Locking
    ]);

    // ── 4. GEÄNDERTE FELDER ERMITTELN ───────────────────────────────────────────
    if (!data || !old_data) {
      return Response.json({
        ok: true,
        skipped: 'data or old_data missing',
      });
    }

    const changedFields = new Set();
    for (const key of Object.keys(data)) {
      if (ignoredFields.has(key)) continue; // Systemfeld ignorieren
      if (JSON.stringify(data[key]) !== JSON.stringify(old_data[key])) {
        changedFields.add(key);
      }
    }

    // Prüfe auch Felder, die in old_data waren aber nicht mehr in data
    for (const key of Object.keys(old_data)) {
      if (ignoredFields.has(key)) continue;
      if (!(key in data)) {
        changedFields.add(key);
      }
    }

    // ── 5. WENN KEINE INHALTSÄNDERUNG: SKIP ──────────────────────────────────────
    if (changedFields.size === 0) {
      return Response.json({
        ok: true,
        skipped: 'no relevant content changes detected',
        changedFields: Array.from(changedFields),
      });
    }

    // ── 6. SYNC-STATUS AKTUALISIEREN ──────────────────────────────────────────────
    // Nur bei echten Inhaltsänderungen:
    // - Wenn synced: modified setzen
    // - Wenn exported: modified setzen
    // - Sonst: Status beibehalten
    const currentSyncStatus = old_data?.sync_status || 'draft';
    
    if (['synced', 'exported'].includes(currentSyncStatus)) {
      // Inhaltsänderung nach Moodle-Sync → modified
      await base44.asServiceRole.entities[entityName].update(entityId, {
        sync_status: 'modified',
      });

      return Response.json({
        ok: true,
        action: 'sync_status_updated',
        entity: entityName,
        entityId,
        transition: `${currentSyncStatus} → modified`,
        changedFields: Array.from(changedFields),
      });
    }

    // Status ist bereits draft/pending/to_delete → kein Actionneeded
    return Response.json({
      ok: true,
      skipped: 'entity already in non-synced state',
      currentStatus: currentSyncStatus,
      changedFields: Array.from(changedFields),
    });

  } catch (error) {
    console.error('Error in syncStatusTracker:', error);
    return Response.json(
      {
        ok: false,
        error: error.message || 'Fehler bei Sync-Status-Tracking',
      },
      { status: 500 }
    );
  }
});