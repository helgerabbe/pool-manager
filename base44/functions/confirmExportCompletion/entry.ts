/**
 * confirmExportCompletion.js
 *
 * Selektive Bestätigung des Moodle-Exports.
 * Nimmt zwei Arrays entgegen:
 *   - successfulIds → sync_status = 'synced', last_synced_at = now
 *   - failedIds     → sync_status = 'error'  (content_status bleibt 'approved' für Retry)
 *
 * Unterstützte Entity-Typen in den Arrays:
 *   LernpaketPhaseAktivitaet, AllgemeineAufgabe, MasterAufgabe, Aufgabenbausteine, Lernpakete
 *
 * Sicherheit: einheit_id MUSS angegeben werden – wird als Filter für Masters/Klone verwendet.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'exporter', 'moodle_export_team'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin or Export-Team access required' }, { status: 403 });
    }

    const body = await req.json();
    const { einheit_id, successfulIds = [], failedIds = [] } = body;

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    if (successfulIds.length === 0 && failedIds.length === 0) {
      return Response.json({ error: 'No IDs provided' }, { status: 400 });
    }

    // ── Einheit-Kontext laden (für Masters/Klone-Filter) ────────────────────
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id });
    const paketIds = new Set(lernpakete.map(lp => lp.id));

    // ── Alle relevanten Entities für diese Einheit laden ────────────────────
    const [aktivitaeten, allgemeineAufgaben, masters] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id }),
      base44.asServiceRole.entities.MasterAufgabe.list(),
    ]);

    const einheitAktivitaetIds = new Set(aktivitaeten.filter(a => paketIds.has(a.lernpaket_id)).map(a => a.id));
    const einheitAufgabeIds = new Set(allgemeineAufgaben.map(a => a.id));
    const einheitMasterIds = new Set(masters.filter(m => paketIds.has(m.lernpaket_id)).map(m => m.id));

    const now = new Date().toISOString();
    let successCount = 0;
    let errorCount = 0;

    // ── Hilfsfunktion: Entity-Typ anhand bekannter ID-Sets ermitteln ─────────
    const resolveEntity = (id) => {
      if (einheitAktivitaetIds.has(id)) return 'LernpaketPhaseAktivitaet';
      if (einheitAufgabeIds.has(id))    return 'AllgemeineAufgabe';
      if (einheitMasterIds.has(id))     return 'MasterAufgabe';
      // Lernpakete direkt per ID prüfen
      if (paketIds.has(id))             return 'Lernpakete';
      return null;
    };

    // ── successfulIds → 'synced' ─────────────────────────────────────────────
    for (const id of successfulIds) {
      const entityType = resolveEntity(id);
      if (!entityType) continue;
      await base44.asServiceRole.entities[entityType].update(id, {
        sync_status: 'synced',
        last_synced_at: now,
      });
      successCount++;
    }

    // Klone der erfolgreichen Masters auch auf synced setzen
    const successMasterIds = successfulIds.filter(id => einheitMasterIds.has(id));
    if (successMasterIds.length > 0) {
      const klone = await base44.asServiceRole.entities.Aufgabenbausteine.list();
      for (const klon of klone) {
        if (successMasterIds.includes(klon.master_aufgabe_id) && klon.sync_status === 'pending') {
          await base44.asServiceRole.entities.Aufgabenbausteine.update(klon.id, {
            sync_status: 'synced',
            last_synced_at: now,
          });
          successCount++;
        }
      }
    }

    // ── failedIds → 'error' (content_status bleibt 'approved' für Retry) ────
    for (const id of failedIds) {
      const entityType = resolveEntity(id);
      if (!entityType) continue;
      await base44.asServiceRole.entities[entityType].update(id, {
        sync_status: 'error',
        // content_status NICHT ändern → bleibt 'approved' für nächsten Versuch
      });
      errorCount++;
    }

    return Response.json({
      success: true,
      message: `Export bestätigt: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen.`,
      synced_count: successCount,
      error_count: errorCount,
      timestamp: now,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});