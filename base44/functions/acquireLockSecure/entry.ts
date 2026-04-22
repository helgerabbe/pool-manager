/**
 * acquireLockSecure.js
 * 
 * Sperrt ein Lernpaket mit RBAC-Prüfung.
 * - Nutzer muss Berechtigung für die Einheit haben
 * - Lock läuft nach 30 Minuten automatisch ab
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

    const { lernpaketId } = await req.json();

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    // Hole Lernpaket + Einheit
    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    const einheit = await base44.entities.Einheiten.get(paket.einheit_id);

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
    if (paket.is_locked && paket.locked_by_email !== user.email) {
      const lockAge = paket.locked_at
        ? Date.now() - new Date(paket.locked_at).getTime()
        : Infinity;
      const thirtyMinutes = 30 * 60 * 1000;

      if (lockAge < thirtyMinutes) {
        // Lock ist noch aktiv → blockieren
        return Response.json(
          {
            error: `Locked by ${paket.locked_by_email}`,
            locked_by_email: paket.locked_by_email,
            code: 'ALREADY_LOCKED',
          },
          { status: 409 }
        );
      }

      // Stale lock → wird überschrieben
      console.log('[acquireLockSecure] Stale lock detected, overriding');
    }

    // Sperre setzen
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: true,
      locked_by_email: user.email,
      locked_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[acquireLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});