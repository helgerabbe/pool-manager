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
    let touched = 0;
    let skipped = 0;
    let errors = 0;
    let cursor = 0;

    // Wir laden alle Activities seitenweise und touchen jede einmal.
    // base44 SDK erlaubt skip/limit über filter-Parameter.
    while (true) {
      const batch = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(
        '-created_date',
        PAGE_SIZE,
        cursor
      );
      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const activity of batch) {
        if (!activity?.id) {
          skipped += 1;
          continue;
        }
        // Throttling: 150ms zwischen Updates, um Rate Limit zu respektieren.
        await new Promise((r) => setTimeout(r, 150));
        try {
          // 1:1 zurückschreiben → Update-Event triggert Guardian.
          await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity.id, {
            is_complete: activity.is_complete === true,
          });
          touched += 1;
        } catch (e) {
          // Bei Rate Limit: kurz warten und einmal retryen.
          if (String(e?.message || '').includes('Rate limit')) {
            await new Promise((r) => setTimeout(r, 1500));
            try {
              await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activity.id, {
                is_complete: activity.is_complete === true,
              });
              touched += 1;
              continue;
            } catch (e2) {
              console.warn('[healLernpaketAggregat] retry failed', activity.id, e2?.message);
            }
          }
          console.warn('[healLernpaketAggregat] update failed', activity.id, e?.message);
          errors += 1;
        }
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