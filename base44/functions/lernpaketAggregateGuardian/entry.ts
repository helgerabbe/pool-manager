/**
 * lernpaketAggregateGuardian
 *
 * Single Source of Truth für die Aggregat-Felder
 *   - LernpaketPhaseAktivitaet.is_complete  (aktiv berechnet)
 *   - Lernpakete.is_complete                (Roll-up über alle lebenden Activities)
 *
 * Wird automatisch von einer Entity-Automation auf
 *   LernpaketPhaseAktivitaet (event_types: ['create', 'update'])
 * getriggert. Damit ist es egal, auf welchem Code-Pfad der Frontend-Save kommt.
 *
 * Berechnung von is_complete (aktiv, NICHT nur Frontend-Wert validieren):
 *
 *   A) Masterfähige Aktivitäten (Katalog.supports_master === true):
 *        is_complete = (≥1 MasterAufgabe existiert)
 *                       UND (field_values.aufgabentext ist nicht leer)
 *      Hinweis: Standardtext zählt als "nicht leer". Das Frontend persistiert
 *      den Default beim ersten Save automatisch (saveFieldsMutation /
 *      saveAufgabentextMutation füllen den Standardtext nach).
 *
 *   B) Nicht-masterfähige Aktivitäten (z. B. "Text lesen"):
 *        is_complete bleibt das, was das Frontend geschrieben hat
 *        (basiert dort auf Pflichtfeld-Prüfung des form_schema).
 *
 * Idempotenz: Wir schreiben nur, wenn sich der Wert tatsächlich ändert –
 * sonst würde die Automation sich selbst rekursiv triggern.
 *
 * Roll-up: Lernpakete.is_complete = (mind. 1 lebende Activity AND alle
 * lebenden Activities is_complete=true). Tombstones (sync_status='to_delete')
 * werden ausgeklammert.
 *
 * @MIGRATION_NOTE (Supabase) – siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md §17
 *   Bei der Migration zu Supabase wandert die Logik in zwei Trigger:
 *   - BEFORE INSERT/UPDATE auf lernpaket_phase_aktivitaet:
 *       is_complete := (case A oder B berechnen)
 *   - AFTER INSERT/UPDATE/DELETE: recalc_lernpaket_is_complete()
 *   Außerdem ein Trigger auf master_aufgabe (INSERT/DELETE), der ein leichtes
 *   UPDATE auf lernpaket_phase_aktivitaet macht, damit der Berechnungs-Trigger
 *   feuert.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const event = payload?.event || {};
    const eventType = event.type;
    const entityId = event.entity_id;
    let data = payload?.data;

    if (!entityId) {
      return Response.json({ skipped: 'no_entity_id' }, { status: 200 });
    }

    if (payload?.payload_too_large || !data) {
      try {
        data = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(entityId);
      } catch (e) {
        return Response.json({ skipped: 'activity_not_found', entityId }, { status: 200 });
      }
    }

    if (!data?.lernpaket_id) {
      return Response.json({ skipped: 'no_lernpaket_id', entityId }, { status: 200 });
    }

    // ── Schritt 1: is_complete AKTIV berechnen ───────────────────────────────
    let computedIsComplete = data.is_complete === true;

    if (data.aktivitaet_id) {
      let katalog = null;
      try {
        katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.get(data.aktivitaet_id);
      } catch (e) {
        console.warn('[aggregateGuardian] Katalog-Read fehlgeschlagen:', e?.message);
      }

      if (katalog?.supports_master === true) {
        // Masterfähig → ≥1 Master UND Aufgabentext nicht leer
        const masters = await base44.asServiceRole.entities.MasterAufgabe.filter({
          activity_id: entityId,
        });
        const hasMaster = Array.isArray(masters) && masters.length > 0;

        const aufgabentext = data?.field_values?.aufgabentext;
        const hasAufgabentext = typeof aufgabentext === 'string' && aufgabentext.trim().length > 0;

        computedIsComplete = hasMaster && hasAufgabentext;
      }
      // Sonst: Frontend-Wert übernehmen (Pflichtfeld-Prüfung läuft dort).
    }

    // Idempotenz: nur schreiben, wenn sich der Wert ändert.
    let activityCorrected = false;
    if (computedIsComplete !== (data.is_complete === true)) {
      await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(entityId, {
        is_complete: computedIsComplete,
      });
      activityCorrected = true;
      data = { ...data, is_complete: computedIsComplete };
    }

    // ── Schritt 2: Roll-up auf Lernpakete.is_complete ────────────────────────
    const [siblings, paket] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: data.lernpaket_id,
      }),
      base44.asServiceRole.entities.Lernpakete.get(data.lernpaket_id),
    ]);

    const living = (siblings || []).filter((a) => a.sync_status !== 'to_delete');
    // Stale-Read-Schutz: gerade korrigierten Wert dieser Activity im Set spiegeln.
    const allComplete = living.every((a) =>
      a.id === entityId ? computedIsComplete === true : a.is_complete === true
    );
    const newPaketIsComplete = living.length > 0 && allComplete;

    let paketCorrected = false;
    if (paket && paket.is_complete !== newPaketIsComplete) {
      await base44.asServiceRole.entities.Lernpakete.update(data.lernpaket_id, {
        is_complete: newPaketIsComplete,
      });
      paketCorrected = true;
    }

    return Response.json({
      ok: true,
      eventType,
      entityId,
      activityCorrected,
      paketCorrected,
      activityIsComplete: computedIsComplete,
      paketIsComplete: newPaketIsComplete,
    });
  } catch (error) {
    console.error('[lernpaketAggregateGuardian] Error:', error);
    // Fehler dürfen den User-Save nicht zurückrollen.
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 200 }
    );
  }
});