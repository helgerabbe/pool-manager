/**
 * diagnosticDuplicateUnits.js
 *
 * Diagnostiziert Duplicate Units und Lock-Issues
 * Hilft bei der Behebung von Duplicates und ungültigen Locks
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const payload = await req.json();
    const { unitName } = payload;

    // Finde alle Einheiten mit diesem Namen
    const allUnits = await base44.asServiceRole.entities.Einheiten.list();
    const duplicates = allUnits.filter(u => u.titel_der_einheit === unitName);

    // Detaillierte Infos zu jedem Duplicate
    const details = duplicates.map(u => ({
      id: u.id,
      titel: u.titel_der_einheit,
      fach: u.fach,
      jahrgangsstufe: u.jahrgangsstufe,
      created_by: u.created_by,
      created_date: u.created_date,
      updated_date: u.updated_date,
      wizard_status: u.wizard_status,
      wizard_max_step: u.wizard_max_step,
      freigabe_status: u.freigabe_status,
      structural_lock: u.structural_lock,
      structural_locked_at: u.structural_locked_at,
      version: u.version,
    }));

    // Lade auch Lernpakete für jede Unit (um zu sehen, welche mehr Inhalte hat)
    const detailsWithContent = await Promise.all(
      details.map(async (d) => {
        const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
          einheit_id: d.id,
        });
        const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({
          einheit_id: d.id,
        });
        const allgemeineAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
          einheit_id: d.id,
        });
        return {
          ...d,
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
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});