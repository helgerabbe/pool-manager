/**
 * handleTaskEditAndResetSync.js
 *
 * Wird aufgerufen, wenn eine Lehrkraft eine bereits exportierte Aufgabe speichert.
 * Setzt beide Sync-Status auf 'modified', damit das Export-Team sieht, dass eine neue Version vorliegt.
 *
 * Diese Funktion sollte im Service (updateAllgemeineAufgabe, updateProjectTask) 
 * NACH jedem Datenbankupdate aufgerufen werden.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EDITABLE_FIELDS = new Set([
  'themenfeld_id',
  'anforderungsebene',
  'aufgaben_typ',
  'mission_type',
  'verlinkte_lernpaket_ids',
  'verlinkte_projekt_ids',
  'verlinkte_aufgaben_ids',
  'lernpaket_logik',
  'erforderliche_anzahl',
  'interne_reihenfolge',
  'hinweise_zum_material',
  'aufgabentyp_projekt',
  'titel',
  'aufgabenstellung',
  'aufgaben_bild_url',
  'schwierigkeitsgrad',
  'ergebnis_form',
  'ergebnis_dateiformat',
  'erwartungshorizont',
  'musterloesung',
  'erstellungs_modus',
  'ki_briefing',
  'alt_text',
  'materialien',
  'output_formats',
  'custom_format',
  'quality_focus',
  'rubric_criteria',
  'brian_dialog_name',
  'brian_learner_instruction',
  'brian_system_instruction',
  'brian_completion_rule',
  'prioritaete_lernziele',
  'ki_kompetenz_tags'
]);

function pickEditableFields(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (EDITABLE_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { aufgabe_id, data } = body;
  if (!aufgabe_id || !data || typeof data !== 'object' || Array.isArray(data)) {
    return Response.json({ error: 'aufgabe_id und data erforderlich' }, { status: 400 });
  }

  try {
    const aufgabe = await base44.entities.AllgemeineAufgabe.get(aufgabe_id).catch(() => null);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    const updateData = pickEditableFields(data);
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'Keine erlaubten Änderungsfelder übergeben' }, { status: 400 });
    }

    const moodleSynced = aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';
    const brianSynced = aufgabe.brian_sync_status === 'synced';

    if (moodleSynced) {
      updateData.moodle_sync_status = 'modified';
      updateData.sync_status = 'modified';
    }
    if (brianSynced) {
      updateData.brian_sync_status = 'modified';
    }

    // Aufgabe im User-Kontext aktualisieren, damit RLS/RBAC greift.
    const updated = await base44.entities.AllgemeineAufgabe.update(aufgabe_id, updateData);

    return Response.json({
      status: 'success',
      message: moodleSynced || brianSynced 
        ? 'Aufgabe aktualisiert – Sync-Status auf "modified" zurückgesetzt'
        : 'Aufgabe aktualisiert',
      sync_status_reset: moodleSynced || brianSynced,
      updated,
    });
  } catch (error) {
    return Response.json({
      error: 'Fehler beim Update: ' + error.message,
    }, { status: 500 });
  }
});