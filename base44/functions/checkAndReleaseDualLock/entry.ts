/**
 * checkAndReleaseDualLock.js
 *
 * Helper-Funktion zur Dual-Lock-Freigabe nach jedem Export (Moodle oder Brian).
 * Wird vom Export-Cockpit aufgerufen, um die Bearbeitungssperre aufzuheben,
 * wenn BEIDE Exporte erfolgreich sind (synced).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { aufgabe_id } = await req.json();
  if (!aufgabe_id) {
    return Response.json({ error: 'aufgabe_id erforderlich' }, { status: 400 });
  }

  try {
    const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.read(aufgabe_id);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    // Prüfung: Sind BEIDE Exporte erfolgreich?
    const moodleSynced = aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';
    const brianSynced = aufgabe.brian_sync_status === 'synced';

    if (moodleSynced && brianSynced) {
      // Dual-Lock aufheben
      await base44.asServiceRole.entities.AllgemeineAufgabe.update(aufgabe_id, {
        locked_by: null,
        locked_at: null,
      });

      return Response.json({
        status: 'success',
        message: 'Dual-Lock aufgehoben (Moodle + Brian beide synced)',
        locked: false,
      });
    }

    return Response.json({
      status: 'success',
      message: 'Aufgabe noch nicht vollständig exportiert – Lock bleibt bestehen',
      locked: true,
      moodle_synced: moodleSynced,
      brian_synced: brianSynced,
    });
  } catch (error) {
    return Response.json({
      error: 'Fehler beim Prüfen der Dual-Lock: ' + error.message,
    }, { status: 500 });
  }
});