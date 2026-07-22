/**
 * setReleaseStatusSecure.js
 *
 * Phase 3 des Freigabe-Konzepts (2026-05-14):
 * Zentrale Backend-Funktion, um den Freigabe-Status einer Aktivität,
 * eines Lernpakets oder einer AllgemeineAufgabe (inkl. Projekt) zu
 * setzen oder zurückzunehmen.
 *
 * Regeln (vgl. lib/releaseLockCheck.js):
 * 1. Wenn Einheit final freigegeben ist (`export_lifecycle_status` ∈
 *    {final_freigegeben, export_running, published}) → IMMER 423.
 * 2. Wenn Lernpaket-Eltern released ist und das Ziel eine Activity ist
 *    → 423 (erst Lernpaket-Freigabe zurücknehmen).
 * 3. Beim Freigeben (release=true) muss `is_complete=true` sein
 *    (ehrlich berechnet, kein Vertrauen ins Frontend).
 * 4. Bei Lernpaket-Freigabe müssen alle aktiven Activities
 *    `content_status='approved'` + `is_complete=true` sein.
 * 5. Zurücknahme (release=false) ist immer erlaubt, solange Punkt 1 + 2
 *    nicht greift. Setzt `released_at`/`released_by` auf null.
 *
 * Parameter:
 *   { targetType: 'activity' | 'lernpaket' | 'allgemeine_aufgabe',
 *     targetId: string,
 *     release: boolean }
 *
 * Response:
 *   200 → { success, targetType, targetId, content_status, released_at, released_by }
 *   400/403/404/422/423 mit Code + Details
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  EINHEIT_LOCKING_LIFECYCLES,
  listAllByFilter,
  validateActivityCompleteness,
  validateAllgemeineAufgabeCompleteness,
  checkUserCanEditEinheit,
} from '../../shared/freigabeShared.js';

function recordsSignature(records) {
  return (records || [])
    .map((record) => `${record.id}:${record.updated_date || ''}:${record.content_status || ''}:${record.is_complete === true}`)
    .sort()
    .join('|');
}

// Vollständigkeits-Validierung + RBAC leben zentral in
// base44/shared/freigabeShared.js (gemeinsam mit bulkReleaseCompleteSecure).
// Synchron halten mit src/lib/completenessValidation.js!

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { targetType, targetId, release } = body;
    if (!targetType || !targetId || typeof release !== 'boolean') {
      return Response.json(
        { error: 'targetType, targetId und release sind erforderlich' },
        { status: 400 }
      );
    }
    if (!['activity', 'lernpaket', 'allgemeine_aufgabe'].includes(targetType)) {
      return Response.json({ error: 'Ungültiger targetType', code: 'INVALID_TARGET' }, { status: 400 });
    }

    // ---- Ziel laden + Parents auflösen
    let target = null;
    let einheit = null;
    let lernpaket = null;
    let catalog = null;

    if (targetType === 'activity') {
      target = await base44.entities.LernpaketPhaseAktivitaet.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Aktivität nicht gefunden oder nicht zugänglich' }, { status: 404 });

      lernpaket = await base44.entities.Lernpakete.get(target.lernpaket_id).catch(() => null);
      if (!lernpaket) return Response.json({ error: 'Parent-Lernpaket nicht gefunden oder nicht zugänglich' }, { status: 404 });

      einheit = await base44.entities.Einheiten.get(lernpaket.einheit_id).catch(() => null);

      const cat = await listAllByFilter(base44.asServiceRole.entities.AktivitaetenKatalog, { id: target.aktivitaet_id });
      catalog = cat[0];
    } else if (targetType === 'lernpaket') {
      target = await base44.entities.Lernpakete.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Lernpaket nicht gefunden oder nicht zugänglich' }, { status: 404 });

      einheit = await base44.entities.Einheiten.get(target.einheit_id).catch(() => null);
    } else {
      // allgemeine_aufgabe (inkl. Projekt)
      target = await base44.entities.AllgemeineAufgabe.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Aufgabe nicht gefunden oder nicht zugänglich' }, { status: 404 });

      einheit = await base44.entities.Einheiten.get(target.einheit_id).catch(() => null);
    }

    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // ---- RBAC
    const auth = await checkUserCanEditEinheit(base44, user, einheit);
    if (!auth.allowed) {
      return Response.json(
        { error: 'Keine Berechtigung', code: 'INSUFFICIENT_PERMISSIONS', reason: auth.reason },
        { status: 403 }
      );
    }

    // ---- Sperr-Check: Einheit final?
    if (EINHEIT_LOCKING_LIFECYCLES.has(einheit.export_lifecycle_status)) {
      return Response.json(
        {
          error: 'Einheit ist final freigegeben — Änderungen am Freigabe-Status nicht möglich',
          code: 'EINHEIT_FINAL_LOCKED',
          status: einheit.export_lifecycle_status,
        },
        { status: 423 }
      );
    }

    // ---- Sperr-Check: Lernpaket darf nicht verändert werden, sobald es in einem gesperrten Dashboard liegt
    if (targetType === 'lernpaket') {
      const memberships = await listAllByFilter(base44.asServiceRole.entities.LernpfadAufgabeMembership, {
        einheit_id: einheit.id,
        aufgabe_id: target.id,
      });
      const lockedMembership = (memberships || []).find((m) => m.pfad_status === 'locked_for_export');
      if (lockedMembership) {
        return Response.json(
          {
            error: 'Lernpaket liegt in einem freigegebenen Dashboard — bitte erst das Dashboard entsperren',
            code: 'DASHBOARD_LOCKED',
            lerntyp: lockedMembership.lerntyp,
          },
          { status: 423 }
        );
      }
    }

    // ---- Sperr-Check: bei Activity → Lernpaket-Parent muss offen sein
    if (targetType === 'activity' && lernpaket?.content_status === 'approved' && lernpaket?.released_at) {
      return Response.json(
        {
          error: 'Parent-Lernpaket ist freigegeben — bitte erst Lernpaket-Freigabe zurücknehmen',
          code: 'PARENT_LERNPAKET_RELEASED',
        },
        { status: 423 }
      );
    }

    // ---- Freigabe vs. Rücknahme
    if (release === true) {
      // Vollständigkeitscheck (ehrlich)
      if (targetType === 'activity') {
        const v = validateActivityCompleteness(catalog, target.field_values || {});
        if (!v.isComplete) {
          return Response.json(
            {
              error: 'Aktivität ist nicht vollständig — Freigabe abgelehnt',
              code: 'NOT_COMPLETE',
              missingFields: v.missingFields,
            },
            { status: 422 }
          );
        }
      } else if (targetType === 'allgemeine_aufgabe') {
        const v = validateAllgemeineAufgabeCompleteness(target);
        if (!v.isComplete) {
          return Response.json(
            {
              error: 'Aufgabe ist nicht vollständig — Freigabe abgelehnt',
              code: 'NOT_COMPLETE',
              missingFields: v.missingFields,
            },
            { status: 422 }
          );
        }
      } else if (targetType === 'lernpaket') {
        // Alle aktiven Activities müssen freigegeben sein. Die inhaltliche Vollständigkeit
        // wurde bereits beim Freigeben der einzelnen Aktivität bzw. Master-Aufgabe geprüft.
        const acts = await listAllByFilter(base44.asServiceRole.entities.LernpaketPhaseAktivitaet, {
          lernpaket_id: target.id,
        });
        const phasenConf = target.phasen_konfiguration || {};
        const active = acts.filter(a => a.sync_status !== 'to_delete' && !(phasenConf[a.phase]?.disabled === true));
        const blocking = active.filter(a => a.content_status !== 'approved');
        if (active.length === 0 || blocking.length > 0) {
          return Response.json(
            {
              error: 'Lernpaket kann nicht freigegeben werden: nicht alle Aktivitäten sind freigegeben',
              code: 'CHILDREN_NOT_RELEASED',
              missingFields: blocking.map(a => ({ fieldName: `activity:${a.id}`, label: a.titel || a.id, reason: 'Aktivität nicht freigegeben' })),
              totalActive: active.length,
              blockingCount: blocking.length,
            },
            { status: 422 }
          );
        }
      }
    }

    // ---- Update durchführen
    const now = new Date().toISOString();
    const updatePayload = release
      ? { content_status: 'approved', released_at: now, released_by: user.email }
      : { content_status: 'draft', released_at: null, released_by: null };

    // Wird ein Lernpaket direkt freigegeben, ist es per Validierung oben
    // vollständig (alle aktiven Aktivitäten sind 'approved'). Die Dashboard-
    // Ampel (lib/ampelLogic.js) verlangt `is_complete === true` für Grün —
    // daher hier mitschreiben, sonst bleibt das freigegebene Lernpaket im
    // Dashboard fälschlich rot ("Entwurf"), bis eine Automation nachzieht.
    if (targetType === 'lernpaket' && release === true) {
      updatePayload.is_complete = true;
    }

    const entityMap = {
      activity: 'LernpaketPhaseAktivitaet',
      lernpaket: 'Lernpakete',
      allgemeine_aufgabe: 'AllgemeineAufgabe',
    };
    const latestEntity = await base44.entities[entityMap[targetType]].get(target.id).catch(() => null);
    if (!latestEntity || latestEntity.updated_date !== target.updated_date) {
      return Response.json(
        { error: 'Der Inhalt wurde zwischenzeitlich geändert. Bitte neu prüfen.', code: 'TARGET_CHANGED' },
        { status: 409 }
      );
    }

    await base44.entities[entityMap[targetType]].update(target.id, updatePayload);

    // ---- Direkter Roll-up: Wenn eine Activity freigegeben/zurückgenommen wird,
    // Lernpakete.is_complete sofort nachziehen. Sonst bleibt der Freigabe-Button
    // bis zum nächsten Tab-Wechsel oder Automation-Refresh deaktiviert.
    let paketIsComplete = null;
    if (targetType === 'activity' && lernpaket?.id) {
      const siblings = await listAllByFilter(base44.asServiceRole.entities.LernpaketPhaseAktivitaet, {
        lernpaket_id: lernpaket.id,
      });
      const phasenConf = lernpaket.phasen_konfiguration || {};
      const active = (siblings || []).filter((a) =>
        a.sync_status !== 'to_delete' && phasenConf[a.phase]?.disabled !== true
      );
      paketIsComplete = active.length > 0 && active.every((a) => {
        if (a.id === target.id) {
          return target.is_complete === true && updatePayload.content_status === 'approved';
        }
        return a.is_complete === true && a.content_status === 'approved';
      });
      if (lernpaket.is_complete !== paketIsComplete) {
        const latestSiblings = await listAllByFilter(base44.asServiceRole.entities.LernpaketPhaseAktivitaet, {
          lernpaket_id: lernpaket.id,
        });
        if (recordsSignature(latestSiblings) !== recordsSignature(siblings)) {
          return Response.json(
            { error: 'Aktivitäten wurden zwischenzeitlich geändert. Bitte neu prüfen.', code: 'SIBLINGS_CHANGED' },
            { status: 409 }
          );
        }
        await base44.entities.Lernpakete.update(lernpaket.id, {
          is_complete: paketIsComplete,
        });
      }
    }

    // ---- Audit-Log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: entityMap[targetType],
        resource_id: target.id,
        changes: {
          release_action: release ? 'release' : 'unrelease',
          targetType,
          einheitId: einheit.id,
          rolle: auth.rolle,
        },
        affected_count: 1,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[setReleaseStatusSecure] Audit log failed:', auditErr);
    }

    return Response.json({
      success: true,
      targetType,
      targetId: target.id,
      content_status: updatePayload.content_status,
      released_at: updatePayload.released_at,
      released_by: updatePayload.released_by,
      paketIsComplete,
    });
  } catch (error) {
    console.error('[setReleaseStatusSecure] Unexpected error:', error);
    return Response.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
});