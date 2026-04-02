/**
 * confirmExportCompletion.js
 * 
 * Admin-Funktion zur Bestätigung des Moodle-Exports.
 * Setzt alle 'pending' Elemente der Einheit auf 'synced'.
 * 
 * Nur für Admins zugänglich.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ────────────────────────────────────────────────────────────────────────────
    // Auth Check: Nur Admins
    // ────────────────────────────────────────────────────────────────────────────

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Request Parsing
    // ────────────────────────────────────────────────────────────────────────────

    const body = await req.json();
    const { einheit_id } = body;

    if (!einheit_id) {
      return Response.json(
        { error: 'Missing einheit_id' },
        { status: 400 }
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Lade alle Elemente der Einheit
    // ────────────────────────────────────────────────────────────────────────────

    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id,
    });

    const paketIds = lernpakete.map(lp => lp.id);

    const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list();
    const masters = await base44.asServiceRole.entities.MasterAufgabe.list();
    const klone = await base44.asServiceRole.entities.Aufgabenbausteine.list();

    const einheitActivities = activities.filter(a => paketIds.includes(a.lernpaket_id));

    const now = new Date().toISOString();
    let updatedCount = 0;

    // ────────────────────────────────────────────────────────────────────────────
    // Aktualisiere alle 'pending' Elemente → 'synced'
    // ────────────────────────────────────────────────────────────────────────────

    // Lernpakete
    for (const paket of lernpakete) {
      if (paket.sync_status === 'pending') {
        await base44.asServiceRole.entities.Lernpakete.update(paket.id, {
          sync_status: 'synced',
          last_synced_at: now,
        });
        updatedCount++;
      }
    }

    // Aktivitäten
    for (const activity of einheitActivities) {
      if (activity.sync_status === 'pending') {
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(
          activity.id,
          {
            sync_status: 'synced',
            last_synced_at: now,
          }
        );
        updatedCount++;
      }
    }

    // Masters
    for (const master of masters) {
      if (master.sync_status === 'pending') {
        await base44.asServiceRole.entities.MasterAufgabe.update(master.id, {
          sync_status: 'synced',
          last_synced_at: now,
        });
        updatedCount++;
      }
    }

    // Klone
    for (const klon of klone) {
      if (klon.sync_status === 'pending') {
        await base44.asServiceRole.entities.Aufgabenbausteine.update(klon.id, {
          sync_status: 'synced',
          last_synced_at: now,
        });
        updatedCount++;
      }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Response
    // ────────────────────────────────────────────────────────────────────────────

    return Response.json({
      success: true,
      message: `✓ Export abgeschlossen. ${updatedCount} Element${updatedCount !== 1 ? 'e' : ''} aktualisiert.`,
      updated_count: updatedCount,
      timestamp: now,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
});