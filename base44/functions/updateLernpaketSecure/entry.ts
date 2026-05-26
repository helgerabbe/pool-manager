/**
 * updateLernpaketSecure.js
 *
 * Sichere Backend-Funktion zum Aktualisieren von Lernpaket-Inhalten und Lernzielen.
 * Exaktes Pendant zu updateActivitySecure.
 *
 * Validiert:
 * 1. Authentifizierung
 * 2. Lock-Ownership: locked_by_user === user.email && lock_status === true
 * 3. lock_version-Abgleich (Race-Condition-Schutz) → HTTP 409 bei Mismatch
 * 4. RBAC: SCHREIB_ROLLEN aus lernpaketLock
 * 5. Einheit-Scope (Structural Lock Prüfung)
 * 6. Audit-Log bei Erfolg und Ablehnung
 *
 * Parameter:
 * - paketId: Lernpakete-ID
 * - updates: Objekt mit zu speichernden Feldern (titel, dauer, etc.)
 * - expectedLockVersion: Aktuelle lock_version des Clients (für Race-Condition-Schutz)
 * - lernzielUpdates: Optional – Array von { id, data } für Lernziel-Updates
 *
 * Rückgabe: { success: boolean, paketId, grantedBy }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 Min
const SCHREIB_ROLLEN = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft'];

function isLockExpired(lockedAt) {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { paketId, updates = {}, expectedLockVersion, lernzielUpdates = [] } = payload;

    if (!paketId) {
      return Response.json({ error: 'paketId ist erforderlich' }, { status: 400 });
    }

    // 1. RBAC: Rolle prüfen
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = benutzer[0];
    const rolle = profil?.rolle || 'Betrachter';
    const faecher = profil?.fachbereich_zustaendigkeit || [];

    if (!SCHREIB_ROLLEN.includes(rolle)) {
      return Response.json(
        { error: 'Keine Schreibberechtigung für diese Rolle', code: 'INSUFFICIENT_ROLE' },
        { status: 403 }
      );
    }

    // 2. Paket im User-Kontext laden, damit RLS/Tenant-Isolation greift.
    const paket = await base44.entities.Lernpakete.get(paketId).catch(() => null);

    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden oder nicht zugänglich' }, { status: 404 });
    }

    // 3. Lock-Ownership prüfen (zwingend)
    // Schema-Alignment-Fix (2026-05-12): Lernpakete-Entity verwendet
    // `is_locked` / `locked_by_email` / `locked_at` (siehe acquireLockSecure
    // und Entity-Schema). Die früheren Feldnamen lock_status/locked_by_user
    // existieren nicht und führten dazu, dass JEDER Save mit LOCK_NOT_HELD
    // scheiterte.
    const lockHeldByOther =
      paket.is_locked &&
      paket.locked_by_email !== user.email &&
      !isLockExpired(paket.locked_at);

    if (lockHeldByOther) {
      return Response.json(
        {
          error: 'Lock wird von anderem Nutzer gehalten',
          code: 'LOCK_NOT_OWNED',
          currentLockOwner: paket.locked_by_email,
        },
        { status: 409 }
      );
    }

    // Nutzer hat keinen aktiven Lock → Save nicht erlaubt
    if (!paket.is_locked || paket.locked_by_email !== user.email) {
      return Response.json(
        {
          error: 'Kein aktiver Lock vorhanden. Bitte Bearbeitungsmodus starten.',
          code: 'LOCK_NOT_HELD',
        },
        { status: 409 }
      );
    }

    // 4. Race-Condition-Schutz: version-Abgleich (Entity-Feld heißt `version`)
    if (expectedLockVersion !== undefined && paket.version !== expectedLockVersion) {
      console.warn(
        `[updateLernpaketSecure] Version mismatch for paket ${paketId}: ` +
        `expected=${expectedLockVersion}, actual=${paket.version} (user: ${user.email})`
      );
      return Response.json(
        {
          error: 'Versionskollision: Datensatz wurde zwischenzeitlich verändert',
          code: 'VERSION_MISMATCH',
          expectedVersion: expectedLockVersion,
          actualVersion: paket.version,
        },
        { status: 409 }
      );
    }

    // 5. Einheit laden für Fach-Scope-Validierung
    let einheit = null;
    if (paket.einheit_id) {
      einheit = await base44.entities.Einheiten.get(paket.einheit_id).catch(() => null);
      if (!einheit) {
        return Response.json({ error: 'Einheit nicht gefunden oder nicht zugänglich' }, { status: 404 });
      }
    }

    // ⛔ Freigabe-Sperre (Phase 3, 2026-05-14):
    // Wenn das Lernpaket freigegeben ist → kein Edit möglich, erst Freigabe
    // zurücknehmen via setReleaseStatusSecure.
    if (paket.content_status === 'approved' && paket.released_at) {
      return Response.json(
        {
          error: 'Lernpaket ist freigegeben — bitte erst die Freigabe zurücknehmen',
          code: 'LERNPAKET_RELEASED',
        },
        { status: 423 }
      );
    }
    // Einheit-Final-Lock (Phase 11)
    if (einheit && (
      einheit.export_lifecycle_status === 'final_freigegeben' ||
      einheit.export_lifecycle_status === 'export_running' ||
      einheit.export_lifecycle_status === 'published'
    )) {
      return Response.json(
        {
          error: 'Einheit ist final freigegeben — Bearbeitung gesperrt',
          code: 'EINHEIT_FINAL_LOCKED',
          status: einheit.export_lifecycle_status,
        },
        { status: 423 }
      );
    }

    // 6. RBAC: Fachschaftsleitung muss das richtige Fach haben
    if (rolle === 'Fachschaftsleitung' && einheit?.fach) {
      if (!faecher.includes(einheit.fach)) {
        return Response.json(
          {
            error: 'Kein Zugriff auf dieses Fach',
            code: 'WRONG_FACH',
          },
          { status: 403 }
        );
      }
    }

    // 7. Fachlehrkraft: delegierte Berechtigung prüfen
    if (rolle === 'Fachlehrkraft' && paket.einheit_id) {
      const membership = await base44.entities.EinheitMembers.filter({
        einheit_id: paket.einheit_id,
        user_email: user.email,
      });
      const delegated = membership[0];
      if (!delegated || !['LEITUNG', 'EDITOR'].includes(delegated.unit_role)) {
        return Response.json(
          {
            error: 'Fachlehrkraft benötigt delegierte LEITUNG oder EDITOR-Rolle für diese Einheit',
            code: 'INSUFFICIENT_DELEGATION',
          },
          { status: 403 }
        );
      }
    }

    // 8. Lernpaket-Felder aktualisieren (nur erlaubte Felder)
    // phasen_konfiguration (siehe Lernpakete-Schema): pro Phase
    // { disabled: boolean }. Wird vom LernpaketPanel-Edit-Dialog mit
    // dem aktiven Lock gesetzt. Lock-Ownership ist oben bereits geprüft.
    const ALLOWED_FIELDS = [
      'titel_des_pakets',
      'geschaetzte_dauer_minuten',
      'themenfeld_id',
      'reihenfolge_nummer',
      'phasen_konfiguration',
    ];
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );

    // Phase G: Auto-Reset des export_error-Flags am Lernpaket beim
    // nächsten Save. Selbst wenn keine fachlichen Felder geändert
    // wurden (z.B. nur Lernziele), zählt der Save-Klick als
    // "Lehrkraft hat sich des Items angenommen" — damit verschwindet
    // das rote Badge sofort.
    await base44.asServiceRole.entities.Lernpakete.update(paketId, {
      ...filteredUpdates,
      export_error: false,
    });

    // 9. Lernziel-Updates (sicher, Lock-geschützt durch diesen Aufruf)
    const lernzielErrors = [];
    for (const lzUpdate of lernzielUpdates) {
      if (!lzUpdate.id || !lzUpdate.data) continue;
      try {
        // Sicherheitscheck: Lernziel gehört zu diesem Paket
        const lernziele = await base44.asServiceRole.entities.Lernziele.filter({ id: lzUpdate.id });
        const lernziel = lernziele[0];
        if (!lernziel || lernziel.lernpaket_id !== paketId) {
          lernzielErrors.push({ id: lzUpdate.id, error: 'Lernziel gehört nicht zu diesem Paket' });
          continue;
        }
        const ALLOWED_LZ_FIELDS = ['formulierung_fachsprache', 'kategorie', 'schueler_uebersetzung'];
        const filteredLzData = Object.fromEntries(
          Object.entries(lzUpdate.data).filter(([key]) => ALLOWED_LZ_FIELDS.includes(key))
        );
        await base44.asServiceRole.entities.Lernziele.update(lzUpdate.id, filteredLzData);
      } catch (e) {
        lernzielErrors.push({ id: lzUpdate.id, error: e.message });
      }
    }

    // 10. Audit-Log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Lernpakete',
        resource_id: paketId,
        changes: {
          updatedFields: Object.keys(filteredUpdates),
          lernzielUpdates: lernzielUpdates.length,
          grantedBy: rolle,
          lockVersion: paket.version,
        },
        affected_count: 1 + lernzielUpdates.length,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[updateLernpaketSecure] Audit log failed:', auditErr);
    }

    console.info(
      `[updateLernpaketSecure] SUCCESS – ${user.email} updated paket ${paketId} ` +
      `(role: ${rolle}, lernziele: ${lernzielUpdates.length})`
    );

    return Response.json({
      success: true,
      paketId,
      grantedBy: rolle,
      lernzielErrors: lernzielErrors.length > 0 ? lernzielErrors : undefined,
    });

  } catch (error) {
    console.error('[updateLernpaketSecure] Unexpected error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
});