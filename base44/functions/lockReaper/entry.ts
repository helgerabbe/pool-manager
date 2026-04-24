/**
 * lockReaper.js
 *
 * Scheduled background job (Automation): bereinigt verwaiste Locks
 * die älter als LOCK_TIMEOUT_MS sind.
 *
 * Sicherheit & Architektur:
 * - Erzwingt Automation-Secret-Validierung
 * - Nur Lernpakete und Einheiten (keine untergeordneten Entities)
 * - DB-Level Filtering (nur stale Locks)
 * - Parallele Batch-Updates statt sequenzieller Aufrufe
 * - Heartbeat-Konsept: Frontend erneuert Lock regelmäßig
 *
 * Läuft alle 30 Sekunden via Automation (scheduled).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Phase 3: Lock Reaper
// Timeout für verwaiste Sperren. 30 Min entspricht der Anforderung aus Phase 3.
const LOCK_TIMEOUT_MINUTES = 30;
const LOCK_TIMEOUT_MS = LOCK_TIMEOUT_MINUTES * 60 * 1000;
const BATCH_SIZE = 50; // Parallele Updates in Batches

// Flexibles Config-Array mit Lock-Feldnamen & Owner-Information
const ENTITIES_WITH_LOCKS = [
  {
    name: 'Lernpakete',
    lockField: 'is_locked',
    lockTimeField: 'locked_at',
    ownerField: 'locked_by',
  },
  {
    name: 'Einheiten',
    lockField: 'structural_lock',
    lockTimeField: 'structural_locked_at',
    ownerField: null, // structural_lock hält bereits den String (Owner embedded)
  },
  {
    name: 'Aufgabenbausteine',
    lockField: 'lock_status',
    lockTimeField: 'locked_at',
    ownerField: 'locked_by_user',
  },
];

/**
 * Validiert Automation-Secret aus Authorization-Header oder Env-Var
 */
function validateAutomationSecret(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const expectedSecret = Deno.env.get('AUTOMATION_SECRET');

  if (!expectedSecret) {
    console.warn('[lockReaper] AUTOMATION_SECRET not configured');
    return false;
  }

  if (!token || token !== expectedSecret) {
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─────────────────────────────────────────────────────────────────
    // 1. Sicherheit: Automation-Secret validieren
    // ─────────────────────────────────────────────────────────────────
    const isValidAutomation = validateAutomationSecret(req);

    // Fallback: User-basierte Auth (für manuelle Trigger)
    let user = null;
    if (!isValidAutomation) {
      try {
        user = await base44.auth.me();
      } catch {
        user = null;
      }

      // Wenn weder Secret noch Admin-User: Fehler
      if (!user || user.role !== 'admin') {
        return Response.json(
          { error: 'Unauthorized: Invalid or missing automation secret' },
          { status: 401 }
        );
      }
    }

    const now = Date.now();
    const results = {};
    let totalReleased = 0;

    // ─────────────────────────────────────────────────────────────────
    // 2. Verarbeite jede Entity mit Lock-Fähigkeit
    // ─────────────────────────────────────────────────────────────────
    for (const entityConfig of ENTITIES_WITH_LOCKS) {
      const { name, lockField, lockTimeField, ownerField } = entityConfig;
      const entity = base44.asServiceRole.entities[name];

      if (!entity) {
        console.warn(`[lockReaper] Entity ${name} not found in SDK`);
        results[name] = { error: 'Entity not available', released: 0 };
        continue;
      }

      // ─────────────────────────────────────────────────────────────────
      // 3. DB-Level Filtering: Nur stale Locks abrufen
      // ─────────────────────────────────────────────────────────────────
      const staleThreshold = new Date(now - LOCK_TIMEOUT_MS).toISOString();

      let staleLocks = [];
      try {
        // Filter: Lock gesetzt UND älter als Threshold
        staleLocks = await entity.filter({
          [lockField]: { $ne: null }, // Lock ist gesetzt
          [lockTimeField]: { $lt: staleThreshold }, // älter als Threshold
        });
      } catch (filterError) {
        // Fallback: Wenn komplexe Filter nicht unterstützt, laden und filtern
        console.warn(
          `[lockReaper] DB-level filtering failed for ${name}, using client-side filter`,
          filterError.message
        );
        try {
          const allWithLock = await entity.filter({
            [lockField]: { $ne: null },
          });
          staleLocks = allWithLock.filter(record => {
            const lockTime = record[lockTimeField];
            if (!lockTime) return true; // Kein Timestamp = veraltet
            return new Date(lockTime).getTime() < now - LOCK_TIMEOUT_MS;
          });
        } catch (fallbackError) {
          console.error(`[lockReaper] Failed to fetch locks for ${name}:`, fallbackError);
          results[name] = { error: fallbackError.message, released: 0 };
          continue;
        }
      }

      if (staleLocks.length === 0) {
        results[name] = { found: 0, released: 0 };
        continue;
      }

      // ─────────────────────────────────────────────────────────────────
      // 4. Dynamisches Update-Payload (flexibel für alle Entities)
      // ─────────────────────────────────────────────────────────────────
      const updatePayload = {
        [lockField]: null,
        [lockTimeField]: null,
      };
      if (ownerField) {
        updatePayload[ownerField] = null;
      }

      const batches = [];
      for (let i = 0; i < staleLocks.length; i += BATCH_SIZE) {
        const batch = staleLocks.slice(i, i + BATCH_SIZE);
        const batchPromise = Promise.all(
          batch.map(record =>
            entity.update(record.id, updatePayload).then(() => {
              const owner = ownerField ? record[ownerField] : record[lockField];
              console.info(
                `[lockReaper] Released stale lock: ${name}/${record.id} ` +
                `(held by ${owner} since ${record[lockTimeField]})`
              );
              return 1;
            }).catch(err => {
              console.error(
                `[lockReaper] Failed to release lock ${name}/${record.id}:`,
                err.message
              );
              return 0;
            })
          )
        );
        batches.push(batchPromise);
      }

      const releaseCounts = await Promise.all(batches);
      const released = releaseCounts.flat().reduce((sum, count) => sum + count, 0);

      results[name] = {
        found: staleLocks.length,
        released,
      };
      totalReleased += released;
    }

    console.info(`[lockReaper] Completed. Total released: ${totalReleased}`);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalReleased,
      details: results,
    });
  } catch (error) {
    console.error('[lockReaper] Unexpected error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});