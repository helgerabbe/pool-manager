/**
 * lernpaketRollup.js – Aggregations-Helper für `Lernpakete.is_complete`
 *
 * Single Source of Truth für die "Definition of Done" eines Lernpakets
 * (siehe Logbuch §17). Wird heute INLINE in die konsumierenden
 * Backend-Functions kopiert (NO LOCAL IMPORTS – siehe §4b), weil
 * Deno-Deploy auf Base44 keine relativen Imports zwischen Functions
 * erlaubt.
 *
 * Definition of Done für `Lernpakete.is_complete = true`
 * ──────────────────────────────────────────────────────
 *   1. Alle `LernpaketPhaseAktivitaet`-Einträge des Pakets haben
 *      `is_complete: true` (und sind nicht als Tombstone markiert,
 *      `sync_status !== 'to_delete'`).
 *   2. Phasen ohne Aktivitäten gelten als irrelevant (sie blockieren
 *      den Status nicht). Ein Paket OHNE jegliche Aktivitäten ist
 *      `is_complete = false` (es gibt nichts, was abgeschlossen sein
 *      könnte).
 *
 * NICHT Bedingung (DoD-Korrektur 2026-04-27):
 *   `MasterAufgabe.content_status === 'approved'` ist KEINE Bedingung.
 *   Vollständigkeit (= "Inhalt steht") und Export-Freigabe (= "darf
 *   raus nach Moodle") sind getrennte Konzepte. Die fehlende Master-
 *   Existenz wird auf Aktivitäts-Ebene in `updateActivitySecure`
 *   abgefangen (Server überschreibt `is_complete=true` zu `false`,
 *   wenn `AktivitaetenKatalog.supports_master === true` ist und kein
 *   Master existiert).
 *
 * Idempotenz:
 *   Schreibt nur, wenn sich der Wert tatsächlich ändert. Verhindert
 *   unnötigen `version`-Bump und Audit-Lärm.
 *
 * @MIGRATION_NOTE (Supabase) – siehe Logbuch §17
 *   Diese Funktion wird durch einen `AFTER UPDATE/INSERT/DELETE`-
 *   Trigger auf `lernpaket_phase_aktivitaet` ersetzt.
 *
 * @param {object} base44     - SDK-Client (mit asServiceRole)
 * @param {string} lernpaketId - ID des Lernpakets
 * @returns {Promise<{ changed: boolean, isComplete: boolean }>}
 */
export async function recalculateLernpaketComplete(base44, lernpaketId) {
  if (!lernpaketId) {
    return { changed: false, isComplete: false };
  }

  // Parallel laden: Aktivitäten, aktuelles Paket.
  const [activities, paket] = await Promise.all([
    base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: lernpaketId,
    }),
    base44.asServiceRole.entities.Lernpakete.get(lernpaketId),
  ]);

  if (!paket) {
    return { changed: false, isComplete: false };
  }

  const livingActivities = (activities || []).filter(
    (a) => a.sync_status !== 'to_delete'
  );

  let isComplete;
  if (livingActivities.length === 0) {
    isComplete = false;
  } else {
    isComplete = livingActivities.every((a) => a.is_complete === true);
  }

  if (paket.is_complete === isComplete) {
    return { changed: false, isComplete };
  }

  await base44.asServiceRole.entities.Lernpakete.update(lernpaketId, {
    is_complete: isComplete,
  });
  return { changed: true, isComplete };
}

// Deno-Deploy verlangt einen Handler, damit die Datei deploybar bleibt.
// Wird nicht als API-Endpunkt genutzt – siehe occLockUtils.js für das
// gleiche Muster.
Deno.serve(() =>
  new Response('lernpaketRollup is a code reference, not an endpoint.', {
    status: 410,
  })
);