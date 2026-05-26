/**
 * updateLernpaketWithStatusManagement.js
 * 
 * Aktualisiert ein Lernpaket und managt die Status-Übergänge:
 * - content_status bleibt immer 'approved' (Struktur-Container)
 * - sync_status: 'new' → 'modified' bei Änderung
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { lernpaket_id, title, reihenfolge_nummer, themenfeld_id } = payload;

    if (!lernpaket_id) {
      return Response.json({ error: 'Missing lernpaket_id' }, { status: 400 });
    }

    // Hole aktuellen Zustand gezielt per ID, statt alle Pakete in den Speicher zu laden.
    const current = await base44.entities.Lernpakete.get(lernpaket_id).catch(() => null);

    if (!current) {
      return Response.json({ error: 'Lernpaket not found or inaccessible' }, { status: 404 });
    }

    const lockHeldByOther =
      current.is_locked === true &&
      current.locked_by_email &&
      current.locked_by_email !== user.email;

    if (lockHeldByOther) {
      return Response.json(
        { error: 'Lernpaket ist durch einen anderen Nutzer gesperrt', code: 'LOCK_NOT_OWNED' },
        { status: 409 }
      );
    }

    let einheit = null;
    if (current.einheit_id) {
      einheit = await base44.entities.Einheiten.get(current.einheit_id).catch(() => null);
      if (!einheit) {
        return Response.json({ error: 'Einheit not found or inaccessible' }, { status: 404 });
      }
    }

    if (['final_freigegeben', 'export_running', 'published'].includes(einheit?.export_lifecycle_status)) {
      return Response.json(
        { error: 'Einheit ist final freigegeben — Bearbeitung gesperrt', code: 'EINHEIT_FINAL_LOCKED' },
        { status: 423 }
      );
    }

    // Berechne neuen sync_status
    let newSyncStatus = current.sync_status || 'new';
    if (newSyncStatus === 'synced') {
      newSyncStatus = 'modified';
    }

    const [latestCurrent, latestEinheit] = await Promise.all([
      base44.entities.Lernpakete.get(lernpaket_id).catch(() => null),
      current.einheit_id ? base44.entities.Einheiten.get(current.einheit_id).catch(() => null) : Promise.resolve(null),
    ]);

    if (!latestCurrent || (current.einheit_id && !latestEinheit)) {
      return Response.json(
        { error: 'Datensatz wurde zwischenzeitlich entfernt oder ist nicht mehr zugänglich', code: 'TARGET_NOT_ACCESSIBLE' },
        { status: 409 }
      );
    }

    const latestLockChanged =
      latestCurrent.updated_date !== current.updated_date ||
      latestCurrent.is_locked !== current.is_locked ||
      latestCurrent.locked_by_email !== current.locked_by_email ||
      latestCurrent.locked_at !== current.locked_at ||
      latestCurrent.sync_status !== current.sync_status ||
      latestEinheit?.export_lifecycle_status !== einheit?.export_lifecycle_status;

    if (latestLockChanged) {
      return Response.json(
        { error: 'Lernpaket wurde zwischenzeitlich geändert. Bitte neu laden.', code: 'VERSION_CHANGED' },
        { status: 409 }
      );
    }

    // Update: content_status bleibt immer 'approved' für Struktur-Container
    const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
      ...(title && { titel_des_pakets: title }),
      ...(reihenfolge_nummer !== undefined && { reihenfolge_nummer }),
      ...(themenfeld_id !== undefined && { themenfeld_id }),
      // Struktur-Container: immer 'approved'
      content_status: 'approved',
      sync_status: newSyncStatus,
      version: Number(current.version || 1) + 1,
    });

    return Response.json({
      success: true,
      lernpaket: updated,
      syncStatusChanged: newSyncStatus !== current.sync_status,
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});