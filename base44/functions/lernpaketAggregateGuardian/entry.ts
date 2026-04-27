/**
 * lernpaketAggregateGuardian
 *
 * Single Source of Truth für die Aggregat-Felder
 *   - LernpaketPhaseAktivitaet.is_complete  (Wahrheitsprüfung gegen MasterAufgaben)
 *   - Lernpakete.is_complete                (Roll-up über alle lebenden Activities)
 *
 * Wird automatisch von einer Entity-Automation auf
 *   LernpaketPhaseAktivitaet (event_types: ['create', 'update'])
 * getriggert. Damit ist es egal, auf welchem Code-Pfad der Frontend-Save kommt
 * (SDK-direct oder updateActivitySecure) – die Wahrheit wird IMMER hergestellt.
 *
 * Architektur (siehe Logbuch §17, Variante C):
 *   1. Wahrheitsprüfung: AktivitaetenKatalog.supports_master abgleichen.
 *   2. Master-Zählung: bei supports_master=true → mindestens 1 MasterAufgabe nötig.
 *   3. Korrektur: is_complete=false erzwingen, falls Anforderung nicht erfüllt.
 *      Diese Korrektur schreibt sich SELBST wieder als Update zurück, würde
 *      also rekursiv die Automation triggern. Schutz: Wir schreiben nur, wenn
 *      sich der Wert tatsächlich ändert (idempotent → keine Endlos-Schleife).
 *   4. Roll-up: Lernpakete.is_complete = (alle lebenden Activities is_complete).
 *
 * @MIGRATION_NOTE (Supabase) – siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md §17
 *   Diese Function ersetzt die früheren Inline-Roll-ups in
 *   updateActivitySecure und deleteActivityWithTombstoneAndCascade.
 *   Bei der Migration zu Supabase wandert die komplette Logik in zwei
 *   Trigger (`enforce_master_existence_on_complete` BEFORE UPDATE +
 *   `recalc_lernpaket_is_complete` AFTER INSERT/UPDATE/DELETE) – siehe §17.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Entity-Automation-Payload: { event, data, old_data, payload_too_large }
    const event = payload?.event || {};
    const eventType = event.type;
    const entityId = event.entity_id;
    let data = payload?.data;

    if (!entityId) {
      return Response.json({ skipped: 'no_entity_id' }, { status: 200 });
    }

    // Falls Payload zu groß war, frische Daten nachladen.
    if (payload?.payload_too_large || !data) {
      try {
        data = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(entityId);
      } catch (e) {
        // Bei DELETE-Events (hier nicht abonniert) oder wenn der Datensatz
        // zwischendurch verschwand: leise abbrechen.
        return Response.json({ skipped: 'activity_not_found', entityId }, { status: 200 });
      }
    }

    if (!data?.lernpaket_id) {
      return Response.json({ skipped: 'no_lernpaket_id', entityId }, { status: 200 });
    }

    // ── Schritt 1+2+3: Wahrheitsprüfung is_complete ──────────────────────────
    let effectiveIsComplete = data.is_complete === true;

    if (effectiveIsComplete && data.aktivitaet_id) {
      let katalog = null;
      try {
        katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.get(data.aktivitaet_id);
      } catch (e) {
        console.warn('[aggregateGuardian] Katalog-Read fehlgeschlagen:', e?.message);
      }

      if (katalog?.supports_master === true) {
        const masters = await base44.asServiceRole.entities.MasterAufgabe.filter({
          activity_id: entityId,
        });
        if (!masters || masters.length === 0) {
          effectiveIsComplete = false;
        }
      }
    }

    // Idempotenz: nur schreiben, wenn sich der Wert tatsächlich ändert –
    // sonst würde die Automation sich selbst rekursiv triggern.
    let activityCorrected = false;
    if (effectiveIsComplete !== (data.is_complete === true)) {
      await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(entityId, {
        is_complete: effectiveIsComplete,
      });
      activityCorrected = true;
      // Lokales `data` für den Roll-up unten konsistent halten.
      data = { ...data, is_complete: effectiveIsComplete };
    }

    // ── Schritt 4: Roll-up auf Lernpakete.is_complete ────────────────────────
    // DoD aus §17: lebendes Geschwister-Set aller Activities (sync_status !==
    // 'to_delete'). Master-Approval ist KEINE Bedingung. Paket grün ⇔
    // mind. 1 lebende Activity AND alle lebenden Activities sind is_complete.
    const [siblings, paket] = await Promise.all([
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: data.lernpaket_id,
      }),
      base44.asServiceRole.entities.Lernpakete.get(data.lernpaket_id),
    ]);

    const living = (siblings || []).filter((a) => a.sync_status !== 'to_delete');
    // Frisch korrigierten Wert dieser Activity im Set spiegeln (Stale-Read-Schutz).
    const allComplete = living.every((a) =>
      a.id === entityId ? effectiveIsComplete === true : a.is_complete === true
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
      activityIsComplete: effectiveIsComplete,
      paketIsComplete: newPaketIsComplete,
    });
  } catch (error) {
    console.error('[lernpaketAggregateGuardian] Error:', error);
    // Wichtig: Fehler dürfen den User-Save nicht zurückrollen. Wir geben 200
    // zurück, damit die Automation als "verarbeitet" gilt – das Aggregat
    // korrigiert sich beim nächsten Save automatisch.
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 200 }
    );
  }
});