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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;

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

// Lock Reaper – AFK-Polish 2026-05-14:
// Timeout für verwaiste Sperren von 30 Min auf 5 Min reduziert. Aktive
// User halten ihre Locks über das Frontend-Heartbeat (alle 25 s,
// useLocks.js heartbeatIntervalMs), daher räumt der Reaper jetzt nur
// noch wirklich verwaiste Locks (Tab geschlossen, Crash, AFK) weg —
// und das deutlich schneller als bisher.
const LOCK_TIMEOUT_MINUTES = 5;
const LOCK_TIMEOUT_MS = LOCK_TIMEOUT_MINUTES * 60 * 1000;
const BATCH_SIZE = 50; // Parallele Updates in Batches

// Flexibles Config-Array mit Lock-Feldnamen & Owner-Information
const ENTITIES_WITH_LOCKS = [
  {
    // Lock-Audit 2026-06-10: ownerField war fälschlich 'locked_by' — das
    // Schema-Feld heißt 'locked_by_email'. Vorher blieb die Besitzer-E-Mail
    // nach dem Reapen in der DB hängen und ein Junk-Feld 'locked_by' wurde
    // geschrieben. Zusätzlich: is_locked ist ein Boolean → mit `false`
    // statt `null` zurücksetzen (lockClearValue).
    name: 'Lernpakete',
    lockField: 'is_locked',
    lockClearValue: false,
    lockTimeField: 'locked_at',
    ownerField: 'locked_by_email',
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
      const { name, lockField, lockTimeField, ownerField, lockClearValue = null } = entityConfig;
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
        // Filter: Lock gesetzt UND älter als Threshold – vollständig paginiert.
        staleLocks = await listAll(entity, {
          [lockField]: { $ne: null },
          [lockTimeField]: { $lt: staleThreshold },
        });
      } catch (filterError) {
        // Fallback: Wenn komplexe Filter nicht unterstützt, paginiert laden und clientseitig filtern.
        console.warn(
          `[lockReaper] DB-level filtering failed for ${name}, using paginated client-side filter`,
          filterError.message
        );
        try {
          const allWithLock = await listAll(entity, {
            [lockField]: { $ne: null },
          });
          staleLocks = allWithLock.filter(record => {
            const lockTime = record[lockTimeField];
            if (!lockTime) return true;
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
        [lockField]: lockClearValue,
        [lockTimeField]: null,
      };
      if (ownerField) {
        updatePayload[ownerField] = null;
      }

      const batches = [];
      for (let i = 0; i < staleLocks.length; i += BATCH_SIZE) {
        const batch = staleLocks.slice(i, i + BATCH_SIZE);
        const batchPromise = Promise.all(
          batch.map(record => {
            const ownerBeforeUpdate = ownerField ? record[ownerField] : record[lockField];
            const lockedAtBeforeUpdate = record[lockTimeField];

            return entity.update(record.id, updatePayload).then(() => {
              console.info(
                `[lockReaper] Released stale lock: ${name}/${record.id} ` +
                `(held by ${ownerBeforeUpdate || 'unknown'} since ${lockedAtBeforeUpdate || 'unknown'})`
              );
              return 1;
            }).catch(err => {
              console.error(
                `[lockReaper] Failed to release lock ${name}/${record.id}:`,
                err.message
              );
              return 0;
            });
          })
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