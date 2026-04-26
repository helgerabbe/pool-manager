import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * forceReleaseLockAdmin
 * 
 * Generische Admin-Funktion: Entsperrt Entities beliebiger Typen erzwungenermaßen.
 * 
 * Unterstützte Entity-Typen:
 *   - Lernpakete: is_locked, locked_by_email, locked_at
 *   - Einheiten: structural_lock, structural_locked_at
 *   - Aufgabenbausteine: lock_status, locked_by_user, locked_at
 * 
 * Payload: { entityName, entityId }
 * Nur Admins dürfen diese Funktion aufrufen.
 */

// Feld-Konfiguration für verschiedene Entity-Typen
const LOCK_FIELD_MAP = {
  'Lernpakete': {
    lockField: 'is_locked',
    ownerField: 'locked_by_email',
    timeField: 'locked_at',
  },
  'Einheiten': {
    lockField: 'structural_lock',
    ownerField: null,
    timeField: 'structural_locked_at',
  },
  'Aufgabenbausteine': {
    lockField: 'lock_status',
    ownerField: 'locked_by_user',
    timeField: 'locked_at',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-Check
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { entityName, entityId } = await req.json();

    // Validierung
    if (!entityName || !entityId) {
      return Response.json({ error: 'entityName and entityId required' }, { status: 400 });
    }

    if (!LOCK_FIELD_MAP[entityName]) {
      return Response.json({ error: `Unsupported entityName: ${entityName}` }, { status: 400 });
    }

    // Entity abrufen (Prüfung ob vorhanden)
    const entity = await base44.entities[entityName].get(entityId);
    if (!entity) {
      return Response.json({ error: `${entityName} not found` }, { status: 404 });
    }

    // Lock-Felder auslesen
    const { lockField, ownerField, timeField } = LOCK_FIELD_MAP[entityName];

    // Update-Payload dynamisch zusammenstellen (alle Felder auf null)
    const updatePayload = {
      [lockField]: null,
      [timeField]: null,
    };
    if (ownerField) {
      updatePayload[ownerField] = null;
    }

    // Optimistic Locking: nur für Einheiten-Schreibzugriffe `version` bumpen.
    // Lernpakete/Aufgabenbausteine haben (Stand 04/2026) noch kein
    // OCC-Feld; dort bleibt das Update unverändert.
    // @MIGRATION_NOTE (Supabase): Inkrement wandert in BEFORE-UPDATE-Trigger.
    if (entityName === 'Einheiten') {
      const currentEinheitVersion = Number.isFinite(entity?.version) ? entity.version : 1;
      updatePayload.version = currentEinheitVersion + 1;
    }

    // Update via Service Role (RLS-sicher)
    await base44.asServiceRole.entities[entityName].update(entityId, updatePayload);

    console.info(
      `[forceReleaseLockAdmin] Released lock for ${entityName}/${entityId} by admin ${user.email}`
    );

    return Response.json({ success: true, message: `Lock released for ${entityName}/${entityId}` });
  } catch (error) {
    console.error('[forceReleaseLockAdmin] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});