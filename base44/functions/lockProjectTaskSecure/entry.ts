/**
 * lockProjectTaskSecure.js
 * 
 * Sperrt eine Projektaufgabe mit RBAC-Prüfung.
 * - Nutzer muss Berechtigung für die Einheit haben
 * - Lock läuft nach 60 Minuten automatisch ab
 * - Verhindert unbefugte Sperren
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await req.json();

    if (!taskId) {
      return Response.json({ error: 'taskId required' }, { status: 400 });
    }

    // Hole Aufgabe + Einheit
    const aufgabe = await base44.entities.AllgemeineAufgabe.get(taskId);

    if (!aufgabe) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const einheit = await base44.entities.Einheiten.get(aufgabe.einheit_id);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // RBAC: Prüfe Berechtigung für diese Einheit
    const istAdmin = user.role === 'admin';
    
    if (!istAdmin) {
      // Prüfe Unit-Level-Mitgliedschaft oder Fach-Zugehörigkeit
      const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
        user_id: user.email,
      });
      const benutzerRecord = benutzer?.[0];
      const istFachschaft = benutzerRecord?.rolle === 'Fachschaftsleitung';
      const fachzustaendig = benutzerRecord?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;

      // Fachschaft oder zuständig für Fach → OK
      if (!istFachschaft && !fachzustaendig) {
        // Prüfe Unit-Level-Mitgliedschaft
        const members = await base44.asServiceRole.entities.EinheitMembers.filter({
          einheit_id: einheit.id,
          user_email: user.email,
        });

        if (members.length === 0) {
          return Response.json(
            { error: 'Keine Berechtigung für diese Einheit' },
            { status: 403 }
          );
        }
      }
    }

    // Prüfe bestehenden Lock
    if (aufgabe.locked_by && aufgabe.locked_by !== user.email) {
      const lockAge = aufgabe.locked_at
        ? Date.now() - new Date(aufgabe.locked_at).getTime()
        : Infinity;
      const sixtyMinutes = 60 * 60 * 1000;

      if (lockAge < sixtyMinutes) {
        // Lock ist noch aktiv → blockieren
        return Response.json(
          {
            error: `Wird gerade von ${aufgabe.locked_by} bearbeitet.`,
            locked_by: aufgabe.locked_by,
            locked_at: aufgabe.locked_at,
          },
          { status: 409 }
        );
      }

      // Stale lock → wird überschrieben
      console.log('[lockProjectTaskSecure] Stale lock detected, overriding');
    }

    // Sperre setzen
    await base44.entities.AllgemeineAufgabe.update(taskId, {
      locked_by: user.email,
      locked_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[lockProjectTaskSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});