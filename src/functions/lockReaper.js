/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * lockReaper.js
 * 
 * Automation zum Cleanup abgelaufener Locks mit:
 * - Secret-Token-Validierung (401 bei fehlender Auth)
 * - Schema-Konsistenz (structural_lock, structural_locked_at)
 * - Multi-Entity Support (Einheiten, Lernpakete)
 * - DB-Level Filtering (nur abgelaufene Locks laden)
 * - Parallele Bulk-Updates (Promise.all in Batches)
 */

// ── KONFIGURATION ────────────────────────────────────────────────────────────
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten
const BATCH_SIZE = 10; // Parallelisierung in Batches

// Entities mit Lock-Feldern
const ENTITIES_WITH_LOCKS = ['Einheiten', 'Lernpakete'];

// Lock-Feld-Mapping
const LOCK_FIELD_MAP = {
  structural: {
    lockField: 'structural_lock',
    lockedAtField: 'structural_locked_at',
  },
  content: {
    lockField: 'is_locked',
    lockedAtField: 'locked_at',
  },
};

Deno.serve(async (req) => {
  try {
    // ── 1. SECRET-TOKEN VALIDIERUNG ─────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = Deno.env.get('LOCK_REAPER_SECRET');

    if (!expectedSecret) {
      console.warn('LOCK_REAPER_SECRET nicht in Umgebung definiert. Skript wird nicht ausgeführt.');
      return Response.json(
        { error: 'Server nicht konfiguriert' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring('Bearer '.length);
    if (token !== expectedSecret) {
      return Response.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // ── 2. BASE44 SERVICEROLE INITIALISIEREN ────────────────────────────────────
    const base44 = createClientFromRequest(req);

    // ── 3. BERECHNE CUTOFF-ZEITSTEMPEL (älter als LOCK_TIMEOUT_MS) ────────────────
    const cutoffTime = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();

    console.log(`🔄 Lock Reaper startet (Cutoff: ${cutoffTime})`);

    let totalReleasedCount = 0;

    // ── 4. PRO ENTITY ABGELAUFENE LOCKS FINDEN UND FREIGEBEN ──────────────────────
    for (const entityName of ENTITIES_WITH_LOCKS) {
      try {
        // Nutze DB-Level Filtering: Lade nur abgelaufene Locks
        // Prüfe structural_lock (häufigster Fall)
        const { lockField, lockedAtField } = LOCK_FIELD_MAP.structural;

        // Filter: lockField != null UND lockedAtField < cutoffTime
        const expiredLocks = await base44.asServiceRole.entities[entityName].filter({
          [lockField]: { $exists: true }, // Lock ist gesetzt
          [lockedAtField]: { $lt: cutoffTime }, // Älter als Cutoff
        });

        if (!expiredLocks || expiredLocks.length === 0) {
          console.log(`  ✓ ${entityName}: Keine abgelaufenen Locks gefunden`);
          continue;
        }

        console.log(`  🔓 ${entityName}: ${expiredLocks.length} abgelaufene Locks gefunden`);

        // ── 5. PARALLELE BATCH-UPDATES ──────────────────────────────────────────
        let releasedInEntity = 0;
        for (let i = 0; i < expiredLocks.length; i += BATCH_SIZE) {
          const batch = expiredLocks.slice(i, i + BATCH_SIZE);
          const updatePromises = batch.map(lock =>
            base44.asServiceRole.entities[entityName].update(lock.id, {
              [lockField]: null, // Lock freigeben
              [lockedAtField]: null, // Timestamp zurücksetzen
            }).catch(err => {
              console.error(`    ❌ Fehler beim Release von ${entityName} ${lock.id}:`, err.message);
              return null; // Fehler ignorieren, nächster Lock
            })
          );

          const results = await Promise.all(updatePromises);
          releasedInEntity += results.filter(r => r !== null).length;
        }

        totalReleasedCount += releasedInEntity;
        console.log(`  ✓ ${entityName}: ${releasedInEntity} Locks freigegeben`);

      } catch (entityError) {
        console.error(`  ❌ Fehler beim Verarbeiten von ${entityName}:`, entityError.message);
        // Fortfahren mit nächster Entity
      }
    }

    // ── 6. RESPONSE ──────────────────────────────────────────────────────────────
    console.log(`✅ Lock Reaper abgeschlossen: ${totalReleasedCount} Locks freigegeben`);

    return Response.json({
      success: true,
      message: 'Lock Reaper execution completed',
      releasedLocks: totalReleasedCount,
      cutoffTime,
      timeoutMinutes: LOCK_TIMEOUT_MS / 60000,
      entitiesProcessed: ENTITIES_WITH_LOCKS,
    });

  } catch (error) {
    console.error('Fatal error in lockReaper:', error);
    return Response.json(
      { error: error.message || 'Kritischer Fehler beim Lock Reaper' },
      { status: 500 }
    );
  }
});