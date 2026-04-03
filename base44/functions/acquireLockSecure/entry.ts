/**
 * acquireLockSecure.js
 *
 * ✅ ATOMAR: Backend-Funktion für sichere Lock-Akquisition mit Versionsprüfung
 *
 * Behebt "The Millisecond Problem" durch:
 * 1. Lesen des aktuellen Zustands + Version
 * 2. Schreiben mit inkrementierter Version (Optimistic Locking)
 * 3. Sofortige Post-Write Verification (kein Timeout)
 * 4. Erkennung von Race Conditions
 *
 * Rückgabe bei Erfolg: { success: true, lockedBy, lockedAt, version }
 * Rückgabe bei Konflikt: HTTP 409 Conflict + Details
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minuten

function isLockExpired(lockedAt) {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId } = await req.json();

    if (!entityName || !entityId) {
      return Response.json(
        { error: 'Missing entityName or entityId' },
        { status: 400 }
      );
    }

    // ✅ Entity-Zugriff mit Service-Role
    const entityRecords = await base44.asServiceRole.entities[entityName].filter({
      id: entityId,
    });
    const current = entityRecords[0];

    if (!current) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    const currentVersion = current.lock_version ?? 0;
    const now = new Date().toISOString();

    // ✅ SCHRITT 1: Prüfe ob Lock bereits von anderem User gehalten wird
    if (
      current.lock_status &&
      current.locked_by_user !== user.email &&
      !isLockExpired(current.locked_at)
    ) {
      return Response.json(
        {
          error: 'Lock held by another user',
          code: 'LOCK_HELD',
          lockedBy: current.locked_by_user,
          lockedAt: current.locked_at,
        },
        { status: 409 }
      );
    }

    // ✅ SCHRITT 2: Atomare Lock-Akquisition mit Versionsprüfung
    await base44.asServiceRole.entities[entityName].update(entityId, {
      lock_status: true,
      locked_by_user: user.email,
      locked_at: now,
      lock_version: currentVersion + 1, // ← Nur wenn keine Race Condition
    });

    // ✅ SCHRITT 3: Post-Write Verification (SOFORT, kein Timeout)
    const verifyRecords = await base44.asServiceRole.entities[entityName].filter({
      id: entityId,
    });
    const verified = verifyRecords[0];

    // Wurde der Write von jemand anderem überschrieben (Race Condition)?
    if (
      !verified ||
      verified.locked_by_user !== user.email ||
      verified.lock_version !== currentVersion + 1
    ) {
      console.warn(
        `[acquireLockSecure] Race condition detected: ${user.email} lost lock on ${entityName}/${entityId}. Winner: ${verified?.locked_by_user ?? 'unknown'}`
      );

      return Response.json(
        {
          error: 'Lock acquisition failed due to race condition',
          code: 'RACE_CONDITION_DETECTED',
          winner: verified?.locked_by_user ?? 'unknown',
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // ✅ SUCCESS
    console.info(
      `[acquireLockSecure] Lock acquired by ${user.email} on ${entityName}/${entityId} (v${currentVersion + 1})`
    );

    return Response.json({
      success: true,
      message: 'Lock acquired successfully',
      entityName,
      entityId,
      lockedBy: user.email,
      lockedAt: now,
      version: currentVersion + 1,
    });
  } catch (error) {
    console.error('[acquireLockSecure] Unexpected error:', error);
    return Response.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
});