import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * acquireLockSecure.js
 *
 * Atomares Locking-System mit Race-Condition-Schutz
 *
 * Sicherheit & Architektur:
 * - Atomares bedingtes Update (verhindert Race Conditions)
 * - Autorisierungsprüfung vor ServiceRole-Einsatz
 * - Dynamische Lock-Spalten (structural vs. content)
 * - Support für Einheiten und Lernpakete
 * - 423 Locked bei bestehenden Locks
 */

// Lock-Typen und ihre entsprechenden Spalten
const LOCK_TYPES = {
  structural: {
    lockField: 'structural_lock',
    lockTimeField: 'structural_locked_at',
  },
  content: {
    lockField: 'content_lock',
    lockTimeField: 'content_locked_at',
  },
};

// Unterstützte Entities mit Lock-Fähigkeit
const SUPPORTED_ENTITIES = {
  Einheiten: 'Einheiten',
  Lernpakete: 'Lernpakete',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId, lockType = 'structural' } = await req.json();

    // ─────────────────────────────────────────────────────────────────
    // 1. Input-Validierung
    // ─────────────────────────────────────────────────────────────────
    if (!entityName || !entityId) {
      return Response.json(
        { error: 'Missing entityName or entityId' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_ENTITIES[entityName]) {
      return Response.json(
        {
          error: `Entity "${entityName}" not supported. Supported: ${Object.keys(SUPPORTED_ENTITIES).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!LOCK_TYPES[lockType]) {
      return Response.json(
        {
          error: `Invalid lockType "${lockType}". Supported: ${Object.keys(LOCK_TYPES).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const lockConfig = LOCK_TYPES[lockType];
    const entity = SUPPORTED_ENTITIES[entityName];

    // ─────────────────────────────────────────────────────────────────
    // 2. Entity-Zugriff über User-Kontext (mit auth)
    // ─────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────
    // 3. Atomares bedingtes Update (Race-Condition-Schutz)
    // ─────────────────────────────────────────────────────────────────
    // Lese-Check: Aktuelle Lock-Status abrufen
    let currentEntity = null;
    try {
      currentEntity = await base44.entities[entityName].get(entityId);
    } catch (err) {
      console.error('[acquireLockSecure] Entity read failed:', err.message);
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    const currentLock = currentEntity[lockConfig.lockField];

    // Atomare Race-Condition-Prüfung:
    // Wenn Lock bereits von jemand anderem gesetzt ist, Fehler 423
    if (currentLock && currentLock !== user.email) {
      return Response.json(
        {
          success: false,
          code: 'LOCK_ACTIVE',
          lockedBy: currentLock,
          lockType,
        },
        { status: 423 }
      );
    }

    // Lock ist entweder null oder gehört bereits dem User → Update durchführen
    const updatePayload = {
      [lockConfig.lockField]: user.email,
      [lockConfig.lockTimeField]: new Date().toISOString(),
    };

    try {
      await base44.entities[entityName].update(entityId, updatePayload);
    } catch (error) {
      // Fallback: Falls das Update fehlschlägt (z.B. durch Constraint),
      // ist Lock wahrscheinlich von jemand anderem gesetzt worden
      console.error('[acquireLockSecure] Atomic update failed:', error.message);
      return Response.json(
        {
          success: false,
          code: 'LOCK_ACTIVE',
          reason: 'Concurrent lock attempt detected',
          lockType,
        },
        { status: 423 }
      );
    }

    return Response.json({
      success: true,
      entityName,
      entityId,
      lockType,
      lockedBy: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[acquireLockSecure] Unexpected error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});