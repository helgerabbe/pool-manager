/**
 * masterAufgabeTouchActivity
 *
 * Entity-Automation-Handler auf MasterAufgabe (create + delete).
 *
 * Zweck: Schließt die in §17 dokumentierte Aggregat-Lücke.
 * Wenn ein User eine MasterAufgabe direkt erstellt oder löscht, ohne dass
 * die Parent-Activity (LernpaketPhaseAktivitaet) ein eigenes update bekommt,
 * läuft `lernpaketAggregateGuardian` nicht – und das Aggregat-Flag
 * `Lernpakete.is_complete` driftet.
 *
 * Lösung: Wir machen ein leichtes "Touch-Update" auf die Parent-Activity.
 * Wir setzen `updated_date` indirekt, indem wir das bestehende `is_complete`
 * 1:1 zurückschreiben. Das triggert die Activity-Automation (Guardian),
 * die dann is_complete aktiv neu berechnet und das Paket-Aggregat aktualisiert.
 *
 * Idempotenz: Der Guardian schreibt selbst nur, wenn sich der berechnete
 * Wert ändert. Doppel-Touches sind unkritisch.
 *
 * Events:
 *   - create: aktivität bekommt jetzt mind. 1 Master → kann grün werden
 *   - delete: aktivität verliert ggf. den letzten Master → muss rot werden
 *   - update: NICHT abonniert (Master-Inhaltsänderung beeinflusst Activity-
 *             Aggregat nach aktueller DoD nicht; Master-Approval landet eh
 *             nicht im Aggregat).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const event = payload?.event || {};
    const eventType = event.type;
    const data = payload?.data || payload?.old_data || null;

    // activity_id steht auf MasterAufgabe (FK zu LernpaketPhaseAktivitaet).
    const activityId = data?.activity_id;
    if (!activityId) {
      return Response.json({ skipped: 'no_activity_id', eventType }, { status: 200 });
    }

    // Aktuelle Activity laden und 1:1 zurückschreiben → triggert Guardian.
    let activity = null;
    try {
      activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(activityId);
    } catch (e) {
      return Response.json({ skipped: 'activity_not_found', activityId }, { status: 200 });
    }

    if (!activity) {
      return Response.json({ skipped: 'activity_null', activityId }, { status: 200 });
    }

    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, {
      is_complete: activity.is_complete === true,
    });

    return Response.json({ ok: true, eventType, activityId });
  } catch (error) {
    console.error('[masterAufgabeTouchActivity] Error:', error);
    // Nie hart fehlschlagen – das Aggregat heilt sich beim nächsten Save selbst.
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 200 }
    );
  }
});