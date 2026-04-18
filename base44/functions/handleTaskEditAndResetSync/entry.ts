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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { aufgabe_id, data } = await req.json();
  if (!aufgabe_id || !data) {
    return Response.json({ error: 'aufgabe_id und data erforderlich' }, { status: 400 });
  }

  try {
    const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.read(aufgabe_id);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    // Sind BEIDE Exporte bereits synced?
    const moodleSynced = aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';
    const brianSynced = aufgabe.brian_sync_status === 'synced';

    if (moodleSynced || brianSynced) {
      // Mindestens ein Export war erfolgreich → bei Änderung Sync-Status zurücksetzen
      data.moodle_sync_status = 'modified';
      data.brian_sync_status = 'modified';
    }

    // Aufgabe aktualisieren
    const updated = await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe_id, data);

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