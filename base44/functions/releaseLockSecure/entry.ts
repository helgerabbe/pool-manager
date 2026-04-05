/**
 * releaseLockSecure.js
 *
 * Generische, sichere Backend-Funktion zur Freigabe von Locks
 * für beliebige Entitäten (Lernpakete, LernpaketPhaseAktivitaet, Aufgabenbausteine, ...).
 *
 * Sicherheitsregeln:
 * - Normaler Nutzer: darf Lock nur freigeben wenn locked_by_user === user.email
 * - Admin (role === 'admin' ODER Benutzer.rolle === 'Administrator'): darf jeden Lock freigeben
 *
 * Parameter:
 * - entityName: Name der Entität (z.B. 'Lernpakete', 'LernpaketPhaseAktivitaet')
 * - entityId: ID des Datensatzes
 *
 * Rückgabe: { success: boolean, entityName, entityId, releasedBy }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Mapping: welches Feld enthält den Lock-Owner?
const LOCK_OWNER_FIELD = {
  Lernpakete: 'locked_by_user',
  LernpaketPhaseAktivitaet: 'locked_by_user',
  Aufgabenbausteine: 'locked_by_user',
};

const SUPPORTED_ENTITIES = Object.keys(LOCK_OWNER_FIELD);

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
        { error: 'entityName und entityId sind erforderlich' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_ENTITIES.includes(entityName)) {
      return Response.json(
        {
          error: `Entität '${entityName}' wird nicht unterstützt`,
          supportedEntities: SUPPORTED_ENTITIES,
        },
        { status: 400 }
      );
    }

    // Datensatz laden
    const records = await base44.asServiceRole.entities[entityName].filter({ id: entityId });
    const record = records[0];

    if (!record) {
      return Response.json({ error: 'Datensatz nicht gefunden' }, { status: 404 });
    }

    const ownerField = LOCK_OWNER_FIELD[entityName];
    const currentOwner = record[ownerField];

    // Admin-Check: Benutzer-Rolle laden
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const userRolle = benutzer[0]?.rolle;
    const isAdmin = user.role === 'admin' || userRolle === 'Administrator';

    // Ownership-Prüfung
    if (!isAdmin && currentOwner !== user.email) {
      return Response.json(
        {
          error: 'Kein Zugriff: Lock gehört einem anderen Nutzer',
          code: 'NOT_LOCK_OWNER',
          currentOwner,
        },
        { status: 403 }
      );
    }

    // Lock freigeben
    await base44.asServiceRole.entities[entityName].update(entityId, {
      lock_status: false,
      [ownerField]: null,
      locked_at: null,
    });

    console.info(
      `[releaseLockSecure] Lock released by ${user.email} on ${entityName}/${entityId}` +
      (isAdmin && currentOwner !== user.email ? ` (admin override, was: ${currentOwner})` : '')
    );

    return Response.json({
      success: true,
      entityName,
      entityId,
      releasedBy: user.email,
      wasAdminOverride: isAdmin && currentOwner !== user.email,
    });

  } catch (error) {
    console.error('[releaseLockSecure] Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
});