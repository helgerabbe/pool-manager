/**
 * lockReaper.js
 *
 * Scheduled background job: bereinigt verwaiste Locks
 * die älter als LOCK_TIMEOUT_MS sind.
 *
 * Läuft alle 1 Minute via Automation (scheduled).
 * Entities: Lernpakete, LernpaketPhaseAktivitaet, Aufgabenbausteine
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minuten

const ENTITIES = [
  'Lernpakete',
  'LernpaketPhaseAktivitaet',
  'Aufgabenbausteine',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: Automation-Aufruf (kein User) oder eingeloggter Admin
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Kein User = Automation-Aufruf → erlaubt

    const now = Date.now();
    const results = {};
    let totalReleased = 0;

    for (const entityName of ENTITIES) {
      const entity = base44.asServiceRole.entities[entityName];

      // Alle gesperrten Datensätze laden
      const locked = await entity.filter({ lock_status: true });

      const stale = locked.filter(record => {
        if (!record.locked_at) return true; // kein Timestamp → immer veraltet
        return now - new Date(record.locked_at).getTime() > LOCK_TIMEOUT_MS;
      });

      let released = 0;
      for (const record of stale) {
        await entity.update(record.id, {
          lock_status: false,
          locked_by_user: null,
          locked_at: null,
        });
        released++;
        console.info(
          `[lockReaper] Released stale lock on ${entityName}/${record.id}` +
          ` (was held by: ${record.locked_by_user}, locked at: ${record.locked_at})`
        );
      }

      results[entityName] = { found: stale.length, released };
      totalReleased += released;
    }

    console.info(`[lockReaper] Done. Total released: ${totalReleased}`);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalReleased,
      details: results,
    });

  } catch (error) {
    console.error('[lockReaper] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});