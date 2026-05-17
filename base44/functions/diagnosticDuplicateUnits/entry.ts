/**
 * diagnosticDuplicateUnits.js
 *
 * Admin-Diagnose für doppelte Einheiten inklusive verlässlicher Inhaltszähler.
 *
 * Supabase-Migrationsnotiz:
 * Dieser Endpunkt sollte später durch ein einziges SQL-Query mit LEFT JOIN / COUNT()
 * ersetzt werden. PostgreSQL kann die Metadaten direkt aggregieren, ohne mehrere
 * HTTP-Requests und ohne Payload-Daten der Kind-Elemente zu übertragen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;

async function listAll(entity, query) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const unitName = typeof payload?.unitName === 'string' ? payload.unitName.trim() : '';

    if (!unitName) {
      return Response.json({ error: 'unitName is required' }, { status: 400 });
    }

    const e = base44.asServiceRole.entities;

    // Wichtig: Datenbank filtert nach Titel; kein vollständiger Tabellen-Scan im Speicher.
    const duplicates = await listAll(e.Einheiten, { titel_der_einheit: unitName });

    const detailsWithContent = await Promise.all(
      duplicates.map(async (unit) => {
        const [lernpakete, themenfelder, allgemeineAufgaben] = await Promise.all([
          listAll(e.Lernpakete, { einheit_id: unit.id }),
          listAll(e.Themenfeld, { einheit_id: unit.id }),
          listAll(e.AllgemeineAufgabe, { einheit_id: unit.id }),
        ]);

        return {
          id: unit.id,
          titel: unit.titel_der_einheit,
          fach: unit.fach,
          jahrgangsstufe: unit.jahrgangsstufe,
          created_by: unit.created_by,
          created_date: unit.created_date,
          updated_date: unit.updated_date,
          wizard_status: unit.wizard_status,
          wizard_max_step: unit.wizard_max_step,
          freigabe_status: unit.freigabe_status,
          structural_lock: unit.structural_lock,
          structural_locked_at: unit.structural_locked_at,
          export_lifecycle_status: unit.export_lifecycle_status,
          version: unit.version,
          lernpakete_count: lernpakete.length,
          themenfelder_count: themenfelder.length,
          aufgaben_count: allgemeineAufgaben.length,
          total_content: lernpakete.length + themenfelder.length + allgemeineAufgaben.length,
        };
      })
    );

    return Response.json({
      success: true,
      unitName,
      duplicateCount: duplicates.length,
      details: detailsWithContent,
    });
  } catch (error) {
    console.error('[DIAGNOSTIC_DUPLICATE_ERROR]', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
});