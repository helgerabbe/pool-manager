/**
 * healLernpaketAggregat
 *
 * Einmalige (idempotent wiederholbare) Heilungs-Funktion für die §17-
 * Aggregat-Logik. Hintergrund: Die Entity-Automationen "Lernpaket Aggregate
 * Guardian" (auf LernpaketPhaseAktivitaet) und "MasterAufgabe → Activity
 * Touch" (auf MasterAufgabe) wurden nach dem ersten Daten-Rollout aktiviert.
 * Bestehende Datensätze (z. B. Activities, deren MasterAufgabe vor der
 * Automation angelegt wurde) haben deshalb noch ein driftendes
 * `is_complete=false`, obwohl alle inhaltlichen Voraussetzungen erfüllt sind.
 *
 * Heilung: Wir touchen ALLE LernpaketPhaseAktivitaet-Records mit ihrem aktuellen
 * is_complete-Wert. Das triggert pro Activity die Guardian-Automation, die
 * dann aktiv neu rechnet (Master vorhanden? Aufgabentext nicht leer?) und das
 * Lernpaket-Roll-up nachzieht.
 *
 * Sicherheit: Admin-only (siehe admin_only_functions_guideline). Die Funktion
 * macht keine destruktiven Operationen — sie kann beliebig oft erneut
 * aufgerufen werden. Idempotent durch den Guardian selbst.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const PAGE_SIZE = 200;
    const UPDATE_CHUNK_SIZE = 10;
    let touched = 0;
    let skipped = 0;
    let errors = 0;
    let cursor = 0;

    const touchActivity = async (activity) => {
      if (!activity?.id) {
        skipped += 1;
        return;
      }

      try {
        // 1:1 zurückschreiben → Update-Event triggert Guardian.
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity.id, {
          is_complete: activity.is_complete === true,
        });
        touched += 1;
      } catch (e) {
        console.warn('[healLernpaketAggregat] update failed', activity.id, e?.message);
        errors += 1;
      }
    };

    // Stabile, paginierte Verarbeitung: filter({}, 'id', limit, skip).
    while (true) {
      const batch = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter(
        {},
        'id',
        PAGE_SIZE,
        cursor
      );
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (let i = 0; i < batch.length; i += UPDATE_CHUNK_SIZE) {
        await Promise.all(batch.slice(i, i + UPDATE_CHUNK_SIZE).map(touchActivity));
      }

      if (batch.length < PAGE_SIZE) break;
      cursor += batch.length;
    }

    return Response.json({
      ok: true,
      touched,
      skipped,
      errors,
      hint: 'Guardian-Automation rechnet pro Touch is_complete neu und zieht das Lernpaket-Aggregat nach.',
    });
  } catch (error) {
    console.error('[healLernpaketAggregat] Error:', error);
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
});