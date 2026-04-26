/**
 * confirmExportCompletion.js
 *
 * Selektive Bestätigung des Moodle-Exports durch Admin/Export-Team.
 *   successfulIds → sync_status = 'synced', last_synced_at = now
 *   failedIds     → sync_status = 'error'  (content_status bleibt 'approved' für Retry)
 *
 * Zusätzlich: **Dual-Lock-Release inline** (siehe Logbuch §14)
 * ───────────────────────────────────────────────────────────────────────
 * Wann immer eine `AllgemeineAufgabe` durch DIESEN Aufruf auf 'synced'
 * gesetzt wird UND `brian_sync_status` bereits 'synced' ist, wird der
 * Bearbeitungssperre (`locked_by`/`locked_at`) im selben Update entfernt.
 * Dadurch entfällt der separate Frontend-Call `checkAndReleaseDualLock`
 * und damit das Risiko von "Zombie-Locks" (Tab schließt zwischen den
 * beiden Aufrufen).
 *
 * Sicherheit:
 *   - RBAC: Admin oder dedizierte Export-Rollen (war bereits vorher da).
 *   - einheit_id MUSS angegeben werden – wird als Filter für Masters/
 *     Klone verwendet und stellt Tenant-Isolation sicher.
 *   - Updates laufen parallel (Promise.allSettled), Fehler einzelner
 *     Updates werden geloggt und gezählt, blockieren aber die übrigen
 *     nicht.
 *
 * Unterstützte Entity-Typen in den Arrays:
 *   LernpaketPhaseAktivitaet, AllgemeineAufgabe, MasterAufgabe,
 *   Aufgabenbausteine, Lernpakete
 *
 * @MIGRATION_NOTE (Supabase) – siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md §14
 *   Der Dual-Lock-Release wandert in einen `AFTER UPDATE`-Trigger auf
 *   `allgemeine_aufgabe`, der `locked_by = NULL` setzt, sobald
 *   `moodle_sync_status = 'synced'` UND `brian_sync_status = 'synced'`.
 *   Damit ist die Inline-Logik hier ein reines Übergangs-Konstrukt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'exporter', 'moodle_export_team'].includes(user.role)) {
      return Response.json(
        { error: 'Forbidden: Admin or Export-Team access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { einheit_id, successfulIds = [], failedIds = [] } = body;

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }
    if (successfulIds.length === 0 && failedIds.length === 0) {
      return Response.json({ error: 'No IDs provided' }, { status: 400 });
    }

    // ── Einheit-Kontext laden (Tenant-Isolation für Masters/Klone) ──────
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id });
    const paketIds = new Set(lernpakete.map((lp) => lp.id));

    const [aktivitaeten, allgemeineAufgaben, masters] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id }),
      base44.asServiceRole.entities.MasterAufgabe.list(),
    ]);

    const aktivitaetMap = new Map(
      aktivitaeten.filter((a) => paketIds.has(a.lernpaket_id)).map((a) => [a.id, a])
    );
    const aufgabeMap = new Map(allgemeineAufgaben.map((a) => [a.id, a]));
    const masterMap = new Map(
      masters.filter((m) => paketIds.has(m.lernpaket_id)).map((m) => [m.id, m])
    );
    const paketMap = new Map(lernpakete.map((lp) => [lp.id, lp]));

    /**
     * Resolve entity type AND current record (für Dual-Lock-Check bei
     * AllgemeineAufgabe). Gibt null zurück, wenn die ID nicht zur
     * aktuellen Einheit gehört (Tenant-Schutz).
     */
    const resolve = (id) => {
      if (aktivitaetMap.has(id)) return { type: 'LernpaketPhaseAktivitaet', record: aktivitaetMap.get(id) };
      if (aufgabeMap.has(id))    return { type: 'AllgemeineAufgabe',          record: aufgabeMap.get(id) };
      if (masterMap.has(id))     return { type: 'MasterAufgabe',              record: masterMap.get(id) };
      if (paketMap.has(id))      return { type: 'Lernpakete',                 record: paketMap.get(id) };
      return null;
    };

    const now = new Date().toISOString();

    // ── successfulIds-Updates parallel zusammenstellen ──────────────────
    const successUpdatePromises = [];
    let dualLockReleased = 0;

    for (const id of successfulIds) {
      const resolved = resolve(id);
      if (!resolved) continue;

      const updatePayload = {
        sync_status: 'synced',
        last_synced_at: now,
      };

      // Spezial-Behandlung AllgemeineAufgabe: Dual-Lock-Release inline,
      // wenn Brian bereits synced ist. Auch moodle_sync_status mitziehen,
      // damit das Schema-Feld konsistent zum sync_status bleibt (Frontend
      // liest beide Felder).
      if (resolved.type === 'AllgemeineAufgabe') {
        updatePayload.moodle_sync_status = 'synced';
        if (resolved.record.brian_sync_status === 'synced') {
          updatePayload.locked_by = null;
          updatePayload.locked_at = null;
          dualLockReleased += 1;
        }
      }

      successUpdatePromises.push(
        base44.asServiceRole.entities[resolved.type].update(id, updatePayload)
      );
    }

    // Klone der erfolgreichen Masters → ebenfalls synced
    const successMasterIds = successfulIds.filter((id) => masterMap.has(id));
    let kloneSynced = 0;
    if (successMasterIds.length > 0) {
      const klone = await base44.asServiceRole.entities.Aufgabenbausteine.list();
      for (const klon of klone) {
        if (successMasterIds.includes(klon.master_aufgabe_id) && klon.sync_status === 'pending') {
          successUpdatePromises.push(
            base44.asServiceRole.entities.Aufgabenbausteine.update(klon.id, {
              sync_status: 'synced',
              last_synced_at: now,
            })
          );
          kloneSynced += 1;
        }
      }
    }

    // ── failedIds-Updates ───────────────────────────────────────────────
    const failedUpdatePromises = [];
    for (const id of failedIds) {
      const resolved = resolve(id);
      if (!resolved) continue;
      const failPayload = { sync_status: 'error' };
      if (resolved.type === 'AllgemeineAufgabe') {
        failPayload.moodle_sync_status = 'error';
      }
      failedUpdatePromises.push(
        base44.asServiceRole.entities[resolved.type].update(id, failPayload)
      );
    }

    // ── Alle Updates parallel feuern + Fehler aggregieren ──────────────
    const allPromises = [...successUpdatePromises, ...failedUpdatePromises];
    const results = await Promise.allSettled(allPromises);
    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      console.error(
        `[confirmExportCompletion] ${rejected.length}/${results.length} updates failed`,
        rejected.slice(0, 3).map((r) => r.reason?.message || String(r.reason))
      );
    }

    const successCount = successUpdatePromises.length - rejected.filter((_, i) => i < successUpdatePromises.length).length;
    const errorCount = failedUpdatePromises.length;

    return Response.json({
      success: true,
      message: `Export bestätigt: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen.`,
      synced_count: successCount,
      error_count: errorCount,
      klone_synced: kloneSynced,
      dual_lock_released: dualLockReleased,
      failed_updates: rejected.length,
      timestamp: now,
    });
  } catch (error) {
    console.error('[confirmExportCompletion] Error:', error);
    return Response.json(
      { success: false, error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
});