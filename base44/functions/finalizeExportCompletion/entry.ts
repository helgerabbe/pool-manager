/**
 * finalizeExportCompletion.js
 *
 * Phase G — End-to-End-Abschluss eines Moodle-Exports vom Export-Center aus.
 *
 * Wendet die vollständige confirmExportCompletion-Logik an:
 *   successfulIds → sync_status='synced', export_error=false
 *   failedIds     → sync_status='error',  export_error=true
 *   AllgemeineAufgabe: moodle_sync_status wird parallel gepflegt.
 *   Dual-Lock-Release: wenn brian_sync_status bereits 'synced' ist, werden
 *   locked_by/locked_at entfernt.
 *   MasterAufgabe: erfolgreiche Master setzen ihre Aufgabenbaustein-Klone
 *   ebenfalls auf synced.
 *
 * Danach wird der Lifecycle der Einheit zurück auf 'draft' gesetzt und
 * fehlerhafte Sektoren werden an LernpfadAufgabeMembership markiert.
 *
 * Supabase-Migrationsnotiz:
 * Diese JavaScript-Auflösung und die vielen Einzelupdates sollten durch eine
 * transaktionale RPC/Stored Procedure ersetzt werden, die Arrays direkt per
 * `UPDATE ... WHERE id = ANY(successful_ids)` verarbeitet.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['Administrator', 'Fachschaftsleitung', 'Moodle-Designer'];
const PAGE_SIZE = 500;
const MAX_BATCH = 200;

async function listAll(entity, query) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function listAllForPaketIds(entity, paketIds, fieldName = 'lernpaket_id') {
  if (paketIds.length === 0) return [];
  const pages = await Promise.all(
    paketIds.map((paketId) => listAll(entity, { [fieldName]: paketId }))
  );
  return pages.flat();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      einheitId,
      successfulIds = [],
      failedIds = [],
      failedSektors = [],
    } = body;

    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    const totalIds = successfulIds.length + failedIds.length;
    if (totalIds > MAX_BATCH) {
      return Response.json(
        {
          error: `Batch-Limit überschritten: ${totalIds} IDs übergeben, max. ${MAX_BATCH} pro Aufruf.`,
          code: 'BATCH_TOO_LARGE',
          max_batch: MAX_BATCH,
          received: totalIds,
        },
        { status: 413 }
      );
    }

    const e = base44.asServiceRole.entities;
    const isBase44Admin = user.role === 'admin' || user.role === 'Administrator';

    if (!isBase44Admin) {
      const benutzer = await listAll(e.Benutzer, { user_id: user.email });
      const profil = benutzer[0];
      const rolle = profil?.rolle;
      if (!ALLOWED_ROLES.includes(rolle)) {
        return Response.json(
          { error: 'Forbidden: Admin, Fachschaftsleitung oder Moodle-Designer erforderlich' },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();

    let einheitVorReset;
    try {
      einheitVorReset = await e.Einheiten.get(einheitId);
    } catch (_err) {
      einheitVorReset = null;
    }
    const lifecycleFrom = einheitVorReset?.export_lifecycle_status || 'draft';

    const lernpakete = await listAll(e.Lernpakete, { einheit_id: einheitId });
    const paketIds = lernpakete.map((lp) => lp.id);
    const [aktivitaeten, allgemeineAufgaben, masters, themenfelder] = await Promise.all([
      listAllForPaketIds(e.LernpaketPhaseAktivitaet, paketIds),
      listAll(e.AllgemeineAufgabe, { einheit_id: einheitId }),
      listAllForPaketIds(e.MasterAufgabe, paketIds),
      listAll(e.Themenfeld, { einheit_id: einheitId }),
    ]);

    const aktivitaetMap = new Map(aktivitaeten.map((a) => [a.id, a]));
    const aufgabeMap = new Map(allgemeineAufgaben.map((a) => [a.id, a]));
    const masterMap = new Map(masters.map((m) => [m.id, m]));
    const paketMap = new Map(lernpakete.map((lp) => [lp.id, lp]));

    const resolve = (id) => {
      if (aktivitaetMap.has(id)) return { type: 'LernpaketPhaseAktivitaet', record: aktivitaetMap.get(id) };
      if (aufgabeMap.has(id)) return { type: 'AllgemeineAufgabe', record: aufgabeMap.get(id) };
      if (masterMap.has(id)) return { type: 'MasterAufgabe', record: masterMap.get(id) };
      if (paketMap.has(id)) return { type: 'Lernpakete', record: paketMap.get(id) };
      return null;
    };

    const itemUpdatePromises = [];
    const dualLockReleasedIds = [];

    for (const id of successfulIds) {
      const resolved = resolve(id);
      if (!resolved) continue;
      const payload = {
        sync_status: 'synced',
        last_synced_at: now,
        export_error: false,
      };
      if (resolved.type === 'AllgemeineAufgabe') {
        payload.moodle_sync_status = 'synced';
        if (resolved.record.brian_sync_status === 'synced') {
          payload.locked_by = null;
          payload.locked_at = null;
          dualLockReleasedIds.push(id);
        }
      }
      itemUpdatePromises.push(e[resolved.type].update(id, payload));
    }

    const successMasterIds = successfulIds.filter((id) => masterMap.has(id));
    let kloneSynced = 0;
    if (successMasterIds.length > 0) {
      const klonPages = await Promise.all(
        successMasterIds.map((masterId) => listAll(e.Aufgabenbausteine, { master_aufgabe_id: masterId }))
      );
      const klone = klonPages.flat();
      for (const klon of klone) {
        if (klon.sync_status === 'pending') {
          itemUpdatePromises.push(
            e.Aufgabenbausteine.update(klon.id, {
              sync_status: 'synced',
              last_synced_at: now,
            })
          );
          kloneSynced += 1;
        }
      }
    }

    for (const id of failedIds) {
      const resolved = resolve(id);
      if (!resolved) continue;
      const payload = { sync_status: 'error', export_error: true };
      if (resolved.type === 'AllgemeineAufgabe') {
        payload.moodle_sync_status = 'error';
      }
      itemUpdatePromises.push(e[resolved.type].update(id, payload));
    }

    // ── Struktur-Container (Themenfelder) auf 'synced' ziehen ───────────
    // Die einzelnen Inhalte (Aktivitäten, Aufgaben, Lernpakete) werden
    // bereits über successfulIds erfasst. Die reinen Struktur-Container
    // (Themenfelder) tauchen aber nicht im Delta-Picker auf — sie sollen
    // nach einem erfolgreichen Export trotzdem als „synchron" gelten,
    // damit ihre Lebenszyklus-Badges nicht fälschlich „Neu/Geändert"
    // anzeigen. Wir ziehen sie nur dann nach, wenn KEINE Fehler gemeldet
    // wurden (failedIds leer) — sonst bleibt der Delta-Zustand erhalten.
    const exportFehlerfrei = failedIds.length === 0;
    if (exportFehlerfrei) {
      for (const tf of themenfelder) {
        if (tf.sync_status !== 'synced') {
          itemUpdatePromises.push(
            e.Themenfeld.update(tf.id, { sync_status: 'synced', last_synced_at: now })
          );
        }
      }
    }

    let sektorErrorCount = 0;
    const sektorUpdatePromises = [];
    if (Array.isArray(failedSektors) && failedSektors.length > 0) {
      const memberships = await listAll(e.LernpfadAufgabeMembership, { einheit_id: einheitId });
      for (const fs of failedSektors) {
        if (!fs?.sektor_id || !fs?.lerntyp) continue;
        const targets = memberships.filter(
          (m) => m.lerntyp === fs.lerntyp && m.sektor_id === fs.sektor_id
        );
        for (const membership of targets) {
          sektorUpdatePromises.push(
            e.LernpfadAufgabeMembership.update(membership.id, { export_error: true })
          );
          sektorErrorCount += 1;
        }
      }
    }

    const itemResults = await Promise.allSettled(itemUpdatePromises);
    const sektorResults = await Promise.allSettled(sektorUpdatePromises);
    const results = [...itemResults, ...sektorResults];
    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      console.error(
        `[finalizeExportCompletion] ${rejected.length}/${results.length} updates failed`,
        rejected.slice(0, 3).map((r) => r.reason?.message || String(r.reason))
      );
    }

    // Einheit: finale Freigabe zurücknehmen (Lifecycle → 'draft'). Die
    // INHALTE bleiben freigegeben (content_status/released_* werden NICHT
    // angefasst) — es wird ausschließlich der "final freigegeben"-Zustand
    // aufgehoben. Zusätzlich: Wenn der Export fehlerfrei war, wird der
    // Lebenszyklus der Einheit selbst auf 'synced' gestellt, damit ihr
    // Struktur-Badge "Synchron" statt "Neu/Geändert" zeigt.
    const einheitUpdate = {
      export_lifecycle_status: 'draft',
      export_lifecycle_changed_at: now,
      export_lifecycle_changed_by: user.email,
      last_synced_at: now,
    };
    if (exportFehlerfrei) {
      einheitUpdate.sync_status = 'synced';
    }
    await e.Einheiten.update(einheitId, einheitUpdate);

    if (dualLockReleasedIds.length > 0) {
      const auditResults = await Promise.allSettled(
        dualLockReleasedIds.map((id) => e.AuditLog.create({
          user_email: user.email,
          action: 'UPDATE',
          resource_type: 'AllgemeineAufgabe',
          resource_id: id,
          changes: { dual_lock_released: true, trigger: 'finalizeExportCompletion' },
          affected_count: 1,
          status: 'success',
        }))
      );
      const auditFailures = auditResults.filter((result) => result.status === 'rejected');
      if (auditFailures.length > 0) {
        console.error(`[finalizeExportCompletion][AUDIT_ERROR] ${auditFailures.length}/${auditResults.length} dual-lock audits failed`);
      }
    }

    const syncedCount = successfulIds.filter((id) => resolve(id)).length;
    const errorCount = failedIds.filter((id) => resolve(id)).length;

    try {
      await e.AuditLog.create({
        user_email: user.email,
        action: 'PUBLISH',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: {
          event: 'export_finalized',
          finalize_export: true,
          from: lifecycleFrom,
          to: 'draft',
          synced_count: syncedCount,
          error_count: errorCount,
          sektor_error_count: sektorErrorCount,
          klone_synced: kloneSynced,
          dual_lock_released: dualLockReleasedIds.length,
        },
        affected_count: syncedCount + errorCount,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[finalizeExportCompletion][AUDIT_ERROR]', auditErr.message);
    }

    return Response.json({
      success: true,
      synced_count: syncedCount,
      error_count: errorCount,
      sektor_error_count: sektorErrorCount,
      klone_synced: kloneSynced,
      dual_lock_released: dualLockReleasedIds.length,
      failed_updates: rejected.length,
      timestamp: now,
    });
  } catch (error) {
    console.error('[finalizeExportCompletion] Error:', error);
    return Response.json(
      { success: false, error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
});