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

    const { entityName, entityId, lockType, parentId, clientLockVersion } = await req.json();

     if (!entityName || !entityId) {
       return Response.json(
         { error: 'Missing entityName or entityId' },
         { status: 400 }
       );
     }

     // ✅ Entity-Zugriff mit Service-Role
     let entityRecords;
     try {
       entityRecords = await base44.asServiceRole.entities[entityName].filter({ id: entityId });
     } catch {
       return Response.json({ error: 'Record not found', code: 'NOT_FOUND' }, { status: 404 });
     }
     const current = entityRecords[0];

     if (!current) {
       return Response.json({ error: 'Record not found', code: 'NOT_FOUND' }, { status: 404 });
     }

     // ✅ HIERARCHIE-CHECK: Wenn parentId vorhanden, locke das Parent statt der Activity
     const lockEntityName = parentId ? 'Lernpakete' : entityName;
     const lockEntityId = parentId || entityId;
     let lockTarget = current;

     if (parentId) {
       const parentRecords = await base44.asServiceRole.entities.Lernpakete.filter({ id: parentId });
       if (!parentRecords[0]) {
         return Response.json({ error: 'Parent record not found', code: 'NOT_FOUND' }, { status: 404 });
       }
       lockTarget = parentRecords[0];
     }

    const now = new Date().toISOString();
    const STRUCT_LOCK_TIMEOUT_MS = 60 * 60 * 1000;

    // ✅ STRUCTURAL LOCK: Spezialpfad für Einheiten-Strukturbearbeitung
    if (lockType === 'structural' && entityName === 'Einheiten') {
      const existingOwner = current.structural_lock;
      const lockedAt = current.structural_locked_at ? new Date(current.structural_locked_at).getTime() : 0;
      const isExpired = Date.now() - lockedAt > STRUCT_LOCK_TIMEOUT_MS;

      if (existingOwner && existingOwner !== user.email && !isExpired) {
        return Response.json(
          {
            error: 'Structural lock held by another user',
            code: 'STRUCTURAL_LOCK_ACTIVE',
            lockedBy: existingOwner,
          },
          { status: 423 }
        );
      }

      await base44.asServiceRole.entities.Einheiten.update(entityId, {
        structural_lock: user.email,
        structural_locked_at: now,
      });

      console.info(`[acquireLockSecure] Structural lock acquired by ${user.email} on Einheit/${entityId}`);
      return Response.json({ success: true, lockedBy: user.email, lockedAt: now });
    }

    const currentVersion = lockTarget.lock_version ?? 0;

     // ✅ Validate clientLockVersion (Compare-and-Swap)
     // Nur wenn clientLockVersion explizit gesetzt wurde (nicht null/undefined)
     if (clientLockVersion !== null && clientLockVersion !== undefined && clientLockVersion !== currentVersion) {
       console.warn(
         `[acquireLockSecure] Version mismatch: client has v${clientLockVersion}, DB has v${currentVersion}`
       );
       return Response.json(
         {
           error: 'Version mismatch - data was modified',
           code: 'VERSION_MISMATCH',
           expectedVersion: clientLockVersion,
           currentVersion: currentVersion,
         },
         { status: 409 }
       );
     }

     // ✅ SCHRITT 0: Szenario 4 – Structural Lock der übergeordneten Einheit prüfen
     // (gilt für LernpaketPhaseAktivitaet und Lernpakete)
     if (lockEntityName === 'Lernpakete') {
       let einheitId = lockTarget.einheit_id;

       if (einheitId) {
         const einheiten = await base44.asServiceRole.entities.Einheiten.filter({ id: einheitId });
         const einheit = einheiten[0];
         if (einheit?.structural_lock && einheit.structural_lock !== user.email) {
           const lockedAt = einheit.structural_locked_at ? new Date(einheit.structural_locked_at).getTime() : 0;
           const isExpired = Date.now() - lockedAt > STRUCT_LOCK_TIMEOUT_MS;
           if (!isExpired) {
             return Response.json(
               {
                 error: 'Structural lock active on parent unit',
                 code: 'STRUCTURAL_LOCK_ACTIVE',
                 structural_lock: true,
                 lockedBy: einheit.structural_lock,
                 message: `Die Struktur der Einheit wird gerade von ${einheit.structural_lock} angepasst. Neue Inhalts-Bearbeitungen sind kurzzeitig gesperrt.`,
               },
               { status: 423 }
             );
           }
           // Abgelaufenen Structural Lock bereinigen
           await base44.asServiceRole.entities.Einheiten.update(einheitId, {
             structural_lock: null, structural_locked_at: null,
           }).catch(() => {});
         }
       }
     }

     // ✅ SCHRITT 1: Prüfe ob Lock bereits von anderem User gehalten wird
     if (
       lockTarget.lock_status &&
       lockTarget.locked_by_user !== user.email &&
       !isLockExpired(lockTarget.locked_at)
     ) {
       return Response.json(
         {
           error: 'Lock held by another user',
           code: 'LOCK_HELD',
           lockedBy: lockTarget.locked_by_user,
           lockedAt: lockTarget.locked_at,
         },
         { status: 409 }
       );
     }

     // ✅ SCHRITT 2: Atomare Lock-Akquisition mit Compare-and-Swap
     // Update NUR wenn lock_version exakt currentVersion ist
     await base44.asServiceRole.entities[lockEntityName].update(lockEntityId, {
       lock_status: true,
       locked_by_user: user.email,
       locked_at: now,
       lock_version: currentVersion + 1,
     });

     // ✅ SCHRITT 3: Post-Write Verification (SOFORT, kein Timeout)
     const verifyRecords = await base44.asServiceRole.entities[lockEntityName].filter({
       id: lockEntityId,
     });
     const verified = verifyRecords[0];

     // ✅ IDEMPOTENZ: Wenn Winner === user.email, zählt das als SUCCESS
     if (
       !verified ||
       verified.lock_version !== currentVersion + 1
     ) {
       // Race Condition nur, wenn jemand ANDERES die Lock hält
       if (verified?.locked_by_user !== user.email) {
         console.warn(
           `[acquireLockSecure] Race condition detected: ${user.email} lost lock on ${lockEntityName}/${lockEntityId}. Winner: ${verified?.locked_by_user ?? 'unknown'}`
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
       // Sonst: Idempotenz-Fall – Du hast die Lock bereits, also ist das SUCCESS
     }

    // ✅ SUCCESS
    console.info(
      `[acquireLockSecure] Lock acquired by ${user.email} on ${lockEntityName}/${lockEntityId} (v${currentVersion + 1})`
    );

    return Response.json({
      success: true,
      message: 'Lock acquired successfully',
      entityName: lockEntityName,
      entityId: lockEntityId,
      originalEntityName: entityName,
      originalEntityId: entityId,
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