/**
 * acquireStructuralLockSecure.js
 * 
 * Exklusiver Pessimistic Lock für Tab 2 (Struktur-Bearbeitung)
 * - Nur berechtigte Nutzer können Lock erwerben
 * - Lock läuft nach 60 Minuten automatisch ab
 * - Verhindert Race Conditions bei gleichzeitiger Bearbeitung
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheit_id } = await req.json();

    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // RBAC: Prüfe ob User Struktur bearbeiten darf
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    const benutzer = benutzerList?.[0];
    const role = user.role === 'admin' ? 'Administrator' : (benutzer?.rolle || 'Betrachter');

    // Admin + Fachschaft dürfen, Lehrkraft nur mit Unit-Level LEITUNG-Rolle
    const istAdmin = role === 'Administrator';
    const istFachschaft = role === 'Fachschaftsleitung';
    
    if (!istAdmin && !istFachschaft) {
      // Prüfe Unit-Level-Mitgliedschaft
      const members = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id: einheit_id,
        user_email: user.email,
        unit_role: 'LEITUNG',
      });
      
      if (members.length === 0) {
        return Response.json(
          { error: 'Keine Berechtigung für Structural Lock' },
          { status: 403 }
        );
      }
    }

    // Hole aktuelle Einheit
    const einheit = await base44.entities.Einheiten.get(einheit_id);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Prüfe bestehenden Lock
    if (einheit.structural_lock && einheit.structural_lock !== user.email) {
      const lockAge = einheit.structural_locked_at
        ? Date.now() - new Date(einheit.structural_locked_at).getTime()
        : Infinity;
      const sixtyMinutes = 60 * 60 * 1000;

      if (lockAge < sixtyMinutes) {
        // Lock ist noch aktiv → blockieren
        return Response.json(
          {
            success: false,
            reason: 'locked_by_other',
            lockedByEmail: einheit.structural_lock,
            lockedAt: einheit.structural_locked_at,
          },
          { status: 409 }
        );
      }

      // Stale lock → wird überschrieben
      console.log('[acquireStructuralLockSecure] Stale lock detected, overriding');
    }

    // Setze Lock
    const now = new Date().toISOString();
    await base44.entities.Einheiten.update(einheitId, {
      structural_lock: user.email,
      structural_locked_at: now,
    });

    return Response.json({
      success: true,
      lockedBy: user.email,
      lockedAt: now,
    });
  } catch (error) {
    console.error('[acquireStructuralLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});