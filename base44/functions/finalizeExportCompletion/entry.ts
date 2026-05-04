/**
 * finalizeExportCompletion.js
 *
 * Phase G — End-to-End-Abschluss eines Moodle-Exports vom Export-Center aus.
 *
 * Wird vom ExportCompletionDialog aufgerufen, NACHDEM der Spezialist die
 * fehlerhaften Items im Hierarchie-Picker markiert hat. Aufgaben dieser
 * Funktion:
 *
 *   1. confirmExportCompletion-Logik anwenden:
 *        successfulIds → sync_status='synced', export_error=false
 *        failedIds     → sync_status='error',  export_error=true
 *      Wir rufen die bestehende Funktion NICHT als HTTP wieder auf, sondern
 *      duplizieren die Update-Logik kompakt hier (vermeidet Cross-Function-
 *      Auth-Komplikationen und behält einen einzigen Kontroll-Punkt für
 *      "Phase G fertig").
 *
 *   2. Lifecycle der Einheit zurück auf 'draft' setzen:
 *        export_lifecycle_status      = 'draft'
 *        export_lifecycle_changed_at  = now
 *        export_lifecycle_changed_by  = user.email
 *        last_synced_at               = now (ISO)
 *
 *   3. Sektoren-Drift-Flag auf den betroffenen Memberships setzen:
 *      Wenn der Spezialist einen Sektor (sektor_id) als 'failed' meldet,
 *      setzen wir export_error=true an allen Memberships dieses Sektors.
 *
 * Payload:
 *   {
 *     einheitId: string,
 *     successfulIds: string[],   // Aufgaben/Pakete/Aktivitäten/Master IDs
 *     failedIds:    string[],
 *     failedSektors: { lerntyp: string, sektor_id: string }[]
 *   }
 *
 * RBAC:
 *   - Nur Admin / Fachschaftsleitung / Moodle-Designer.
 *
 * Rückgabe: { success, synced_count, error_count, sektor_error_count }.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_ROLES = ['Administrator', 'Fachschaftsleitung', 'Moodle-Designer'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rolle prüfen.
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    const profil = benutzer[0];
    const rolle = profil?.rolle;
    if (!ALLOWED_ROLES.includes(rolle)) {
      return Response.json(
        { error: 'Forbidden: Admin, Fachschaftsleitung oder Moodle-Designer erforderlich' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      einheitId,
      successfulIds = [],
      failedIds = [],
      failedSektors = [],
    } = body;

    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── Items resolven (Tenant-Isolation auf einheit_id) ──────────────
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id: einheitId,
    });
    const paketIds = new Set(lernpakete.map((lp) => lp.id));
    const [aktivitaeten, allgemeineAufgaben, masters] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
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

    const resolve = (id) => {
      if (aktivitaetMap.has(id)) return 'LernpaketPhaseAktivitaet';
      if (aufgabeMap.has(id)) return 'AllgemeineAufgabe';
      if (masterMap.has(id)) return 'MasterAufgabe';
      if (paketMap.has(id)) return 'Lernpakete';
      return null;
    };

    const updates = [];
    let syncedCount = 0;
    let errorCount = 0;

    for (const id of successfulIds) {
      const type = resolve(id);
      if (!type) continue;
      const payload = {
        sync_status: 'synced',
        last_synced_at: now,
        export_error: false,
      };
      if (type === 'AllgemeineAufgabe') {
        payload.moodle_sync_status = 'synced';
      }
      updates.push(base44.asServiceRole.entities[type].update(id, payload));
      syncedCount += 1;
    }

    for (const id of failedIds) {
      const type = resolve(id);
      if (!type) continue;
      const payload = { sync_status: 'error', export_error: true };
      if (type === 'AllgemeineAufgabe') {
        payload.moodle_sync_status = 'error';
      }
      updates.push(base44.asServiceRole.entities[type].update(id, payload));
      errorCount += 1;
    }

    // ── Sektor-Fehler in Memberships markieren ────────────────────────
    let sektorErrorCount = 0;
    if (Array.isArray(failedSektors) && failedSektors.length > 0) {
      const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheitId,
      });
      for (const fs of failedSektors) {
        if (!fs?.sektor_id || !fs?.lerntyp) continue;
        const targets = memberships.filter(
          (m) => m.lerntyp === fs.lerntyp && m.sektor_id === fs.sektor_id
        );
        for (const m of targets) {
          updates.push(
            base44.asServiceRole.entities.LernpfadAufgabeMembership.update(m.id, {
              export_error: true,
            })
          );
          sektorErrorCount += 1;
        }
      }
    }

    const results = await Promise.allSettled(updates);
    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      console.error(
        `[finalizeExportCompletion] ${rejected.length}/${results.length} updates failed`
      );
    }

    // ── Lifecycle der Einheit zurück auf 'draft' ─────────────────────
    await base44.asServiceRole.entities.Einheiten.update(einheitId, {
      export_lifecycle_status: 'draft',
      export_lifecycle_changed_at: now,
      export_lifecycle_changed_by: user.email,
      last_synced_at: now,
    });

    // Audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheitId,
        changes: {
          finalize_export: true,
          synced_count: syncedCount,
          error_count: errorCount,
          sektor_error_count: sektorErrorCount,
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