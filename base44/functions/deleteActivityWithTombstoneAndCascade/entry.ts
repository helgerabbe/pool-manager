/**
 * deleteActivityWithTombstoneAndCascade.js
 *
 * Vollständige Löschkaskade für eine Aktivität (Tab 3):
 *
 *  • Aktivität (LernpaketPhaseAktivitaet)        → TOMBSTONE (sync_status='to_delete')
 *      Grund: Moodle muss vom Löschen erfahren – der Datensatz selbst bleibt
 *             als Markierung erhalten und wird vom Sync-Prozess hart gelöscht,
 *             sobald Moodle bestätigt hat.
 *
 *  • MasterAufgabe(n) zur Aktivität              → HARD DELETE
 *  • Aufgabenbausteine (Klone der Master)        → HARD DELETE
 *      Grund: Diese Inhalte werden niemals direkt nach Moodle gepusht.
 *             Sie sind Hilfs-/Generator-Daten und müssen ohne Spuren weg.
 *
 *  • Alle Base44-Storage-URLs in field_values    → eintragen in OrphanedFile
 *      Grund: Es gibt aktuell keine Storage-Delete-API im SDK.
 *             Verwaiste Dateien werden in einer GC-Queue protokolliert,
 *             die ein zukünftiger Garbage-Collector-Job abarbeitet.
 *
 * Sicherheit:
 *  - Auth erforderlich
 *  - Nutzer muss Bearbeitungs-Lock auf dem übergeordneten Lernpaket halten
 *  - Export-Lock blockiert die Löschung (423)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Helfer: Base44-Storage-URLs in einem Wert finden ──────────────────────
// Eine Storage-URL ist typischerweise https://… mit "base44.app" oder
// "base44.com" oder beginnt mit "base44://" (Private-Storage-URI).
function isBase44StorageUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  const v = value.trim();
  if (v.startsWith('base44://')) return true;
  if (v.startsWith('http://') || v.startsWith('https://')) {
    const lower = v.toLowerCase();
    return lower.includes('base44.app') || lower.includes('base44.com') || lower.includes('base44io');
  }
  return false;
}

// Rekursiv durch ein beliebiges JSON-Objekt iterieren und alle
// Base44-Storage-URLs sammeln (inkl. Pfad-Information für Debugging).
function collectStorageUrls(obj, pathPrefix = '') {
  const found = [];
  if (obj == null) return found;

  if (typeof obj === 'string') {
    if (isBase44StorageUrl(obj)) {
      found.push({ url: obj, field_name: pathPrefix || '(root)' });
    }
    return found;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      found.push(...collectStorageUrls(item, `${pathPrefix}[${idx}]`));
    });
    return found;
  }

  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
      found.push(...collectStorageUrls(val, nextPath));
    }
  }
  return found;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_id } = await req.json();
    if (!activity_id) {
      return Response.json({ error: 'Missing activity_id' }, { status: 400 });
    }

    // ── 1. Aktivität laden ────────────────────────────────────────────────
    let activity = null;
    try {
      const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ id: activity_id });
      activity = activities?.[0] || null;
    } catch (err) {
      // Filter kann bei ungültiger ID werfen → behandeln wir wie "nicht gefunden"
      console.warn('[deleteActivityWithTombstoneAndCascade] Activity lookup failed:', err?.message);
    }
    if (!activity) {
      return Response.json({ error: 'Aktivität nicht gefunden' }, { status: 404 });
    }

    const lernpaketId = activity.lernpaket_id;
    if (!lernpaketId) {
      return Response.json({ error: 'Aktivität hat kein zugeordnetes Lernpaket' }, { status: 400 });
    }

    // ── 2. Lock-Prüfung am übergeordneten Lernpaket ──────────────────────
    const pakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: lernpaketId });
    const lernpaket = pakete?.[0];
    if (!lernpaket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }

    const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
    const lockActive =
      lernpaket.is_locked &&
      lernpaket.locked_by_email === user.email &&
      lernpaket.locked_at &&
      Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

    if (!lockActive) {
      return Response.json(
        {
          error: 'Forbidden: Sie müssen einen aktiven Bearbeitungs-Lock auf diesem Lernpaket halten',
          currentLock: lernpaket.locked_by_email || null,
        },
        { status: 403 }
      );
    }

    // ── 3. Export-Lock ────────────────────────────────────────────────────
    if (lernpaket.export_locked === true || lernpaket.moodle_sync_status === 'locked') {
      return Response.json(
        {
          error: 'Delete abgelehnt: Einheit ist zur Moodle-Synchronisation gesperrt.',
          code: 'EXPORT_LOCKED',
        },
        { status: 423, headers: { 'Retry-After': '5' } }
      );
    }

    // ── 4. Verwaiste Dateien einsammeln (vor jeder Löschung) ─────────────
    // 4a) aus der Aktivität selbst
    const orphanRecords = [];
    const activityUrls = collectStorageUrls(activity.field_values || {}, '');
    activityUrls.forEach(({ url, field_name }) => {
      orphanRecords.push({
        file_url: url,
        source_entity: 'LernpaketPhaseAktivitaet',
        source_record_id: activity.id,
        field_name,
        context_einheit_id: lernpaket.einheit_id || null,
        context_lernpaket_id: lernpaketId,
        deleted_at: new Date().toISOString(),
        status: 'pending',
      });
    });

    // 4b) aus zugehörigen MasterAufgaben
    const masterAufgaben = await base44.asServiceRole.entities.MasterAufgabe.filter({
      activity_id: activity_id,
    });
    for (const master of masterAufgaben) {
      const mUrls = collectStorageUrls(master.field_values || master.content || {}, '');
      mUrls.forEach(({ url, field_name }) => {
        orphanRecords.push({
          file_url: url,
          source_entity: 'MasterAufgabe',
          source_record_id: master.id,
          field_name,
          context_einheit_id: lernpaket.einheit_id || null,
          context_lernpaket_id: lernpaketId,
          deleted_at: new Date().toISOString(),
          status: 'pending',
        });
      });
    }

    // 4c) aus Klonen (Aufgabenbausteine), die an einer dieser MasterAufgaben hängen
    const masterIds = masterAufgaben.map(m => m.id);
    let klone = [];
    if (masterIds.length > 0) {
      // Filter pro MasterID, da Base44 kein $in unterstützt → parallel
      const klonResults = await Promise.all(
        masterIds.map(mid =>
          base44.asServiceRole.entities.Aufgabenbausteine.filter({ master_aufgabe_id: mid })
        )
      );
      klone = klonResults.flat();
      for (const klon of klone) {
        const kUrls = collectStorageUrls(
          {
            material_referenz: klon.material_referenz,
            aufgabentext_inhalt: klon.aufgabentext_inhalt,
          },
          ''
        );
        kUrls.forEach(({ url, field_name }) => {
          orphanRecords.push({
            file_url: url,
            source_entity: 'Aufgabenbausteine',
            source_record_id: klon.id,
            field_name,
            context_einheit_id: lernpaket.einheit_id || null,
            context_lernpaket_id: lernpaketId,
            deleted_at: new Date().toISOString(),
            status: 'pending',
          });
        });
      }
    }

    // ── 5. OrphanedFile-Einträge schreiben (best effort, parallel) ───────
    let orphansLogged = 0;
    if (orphanRecords.length > 0) {
      try {
        if (typeof base44.asServiceRole.entities.OrphanedFile.bulkCreate === 'function') {
          await base44.asServiceRole.entities.OrphanedFile.bulkCreate(orphanRecords);
        } else {
          await Promise.all(
            orphanRecords.map(r => base44.asServiceRole.entities.OrphanedFile.create(r))
          );
        }
        orphansLogged = orphanRecords.length;
      } catch (err) {
        console.error('[deleteActivityWithTombstoneAndCascade] OrphanedFile logging failed:', err?.message);
        // Nicht abbrechen – Löschung muss trotzdem fortgesetzt werden.
      }
    }

    // ── 6. Klone HART löschen ────────────────────────────────────────────
    let klonDeleted = 0;
    if (klone.length > 0) {
      const results = await Promise.allSettled(
        klone.map(k => base44.asServiceRole.entities.Aufgabenbausteine.delete(k.id))
      );
      klonDeleted = results.filter(r => r.status === 'fulfilled').length;
    }

    // ── 7. MasterAufgaben HART löschen ──────────────────────────────────
    let masterDeleted = 0;
    if (masterAufgaben.length > 0) {
      const results = await Promise.allSettled(
        masterAufgaben.map(m => base44.asServiceRole.entities.MasterAufgabe.delete(m.id))
      );
      masterDeleted = results.filter(r => r.status === 'fulfilled').length;
    }

    // ── 8. Aktivität auf Tombstone setzen (für Moodle-Sync) ─────────────
    const updated = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity_id, {
      sync_status: 'to_delete',
      is_dirty_since_export: true,
    });

    // ── 8b. Roll-up auf `Lernpakete.is_complete` ──
    // Ab Variante C (§17) erledigt das die Entity-Automation
    // `lernpaketAggregateGuardian`. Das `update`-Call oben (Schritt 8,
    // sync_status='to_delete') triggert die Automation, die dann das
    // Paket-Aggregat neu rechnet (Tombstones werden gefiltert). Kein
    // Inline-Roll-up mehr nötig.

    console.info(
      `[deleteActivityWithTombstoneAndCascade] Activity ${activity_id} tombstoned. ` +
      `Master deleted: ${masterDeleted}, Klone deleted: ${klonDeleted}, Orphans logged: ${orphansLogged}`
    );

    return Response.json({
      success: true,
      activity: updated,
      stats: {
        master_deleted: masterDeleted,
        klone_deleted: klonDeleted,
        orphans_logged: orphansLogged,
      },
    });
  } catch (error) {
    console.error('[deleteActivityWithTombstoneAndCascade] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
});