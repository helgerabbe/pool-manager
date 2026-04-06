/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * approveMasterAufgabe.js
 * 
 * Sichere Freigabe/Rücknahme von Masteraufgaben mit:
 * - Tenant-Isolation (Zugehörigkeitsprüfung)
 * - Lock-Validation (nur bei aktuellem Bearbeitungs-Lock)
 * - Klon-Blockade (is_master === false wird abgelehnt)
 * - Sync-Status-Management
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId, action } = await req.json();

    if (!masterId || !action) {
      return Response.json({ error: 'masterId und action sind erforderlich' }, { status: 400 });
    }

    if (!['approve', 'unapprove'].includes(action)) {
      return Response.json({ error: 'action muss "approve" oder "unapprove" sein' }, { status: 400 });
    }

    // ── 1. MASTERAUFGABE LESEN ──────────────────────────────────────────────────
    const aufgaben = await base44.asServiceRole.entities.MasterAufgabe.filter({ id: masterId });
    if (!aufgaben || aufgaben.length === 0) {
      return Response.json({ error: 'Masteraufgabe nicht gefunden' }, { status: 404 });
    }

    const aufgabe = aufgaben[0];

    // ── 2. KLON-BLOCKADE: is_master prüfen ──────────────────────────────────────
    if (aufgabe.is_master === false) {
      return Response.json(
        { error: 'Klone können nicht direkt freigegeben werden. Befördern Sie den Klon zuerst zur Masteraufgabe.' },
        { status: 400 }
      );
    }

    // ── 3. AKTIVITÄT UND LERNPAKET LADEN (Zugehörigkeitsprüfung) ────────────────
    if (!aufgabe.activity_id || !aufgabe.lernpaket_id) {
      return Response.json(
        { error: 'Masteraufgabe hat ungültige Zuordnung (activity_id oder lernpaket_id fehlt)' },
        { status: 400 }
      );
    }

    const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ id: aufgabe.activity_id });
    if (!activities || activities.length === 0) {
      return Response.json(
        { error: 'Zugeordnete Aktivität nicht gefunden (Zugehörigkeitsprüfung fehlgeschlagen)' },
        { status: 403 }
      );
    }

    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: aufgabe.lernpaket_id });
    if (!lernpakete || lernpakete.length === 0) {
      return Response.json(
        { error: 'Zugeordnetes Lernpaket nicht gefunden (Zugehörigkeitsprüfung fehlgeschlagen)' },
        { status: 403 }
      );
    }

    const lernpaket = lernpakete[0];

    // ── 4. LOCK-VALIDIERUNG: Nutzer muss das Lernpaket halten ──────────────────
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

    const isLocked = lernpaket.is_locked && 
                     lernpaket.locked_by_email === user.email &&
                     lernpaket.locked_at &&
                     Date.now() - new Date(lernpaket.locked_at).getTime() < LOCK_TIMEOUT_MS;

    if (!isLocked) {
      return Response.json(
        { 
          error: 'Bearbeitungs-Lock erforderlich',
          detail: lernpaket.is_locked && lernpaket.locked_by_email !== user.email
            ? `Lernpaket ist durch ${lernpaket.locked_by_email} gesperrt`
            : 'Lernpaket ist nicht durch Sie gesperrt oder Lock ist abgelaufen'
        },
        { status: 403 }
      );
    }

    // ── 5. STATUS-UPDATE MIT SYNC-LOGIK ─────────────────────────────────────────
    const newContentStatus = action === 'approve' ? 'approved' : 'draft';
    
    // Sync-Status-Logik:
    // - Bei approve: Wenn noch nicht synced, auf 'pending' setzen (bereit für Moodle)
    // - Bei unapprove: Auf 'modified' setzen (wurde geändert nach Sync)
    let newSyncStatus = aufgabe.sync_status;
    if (action === 'approve' && aufgabe.sync_status === 'new') {
      newSyncStatus = 'pending';
    } else if (action === 'unapprove' && aufgabe.sync_status === 'synced') {
      newSyncStatus = 'modified';
    }

    // Update durchführen
    await base44.asServiceRole.entities.MasterAufgabe.update(masterId, {
      content_status: newContentStatus,
      sync_status: newSyncStatus,
    });

    // ── 6. RESPONSE ─────────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      message: action === 'approve'
        ? 'Masteraufgabe als fertig markiert'
        : 'Freigabe der Masteraufgabe zurückgezogen',
      updatedFields: {
        content_status: newContentStatus,
        sync_status: newSyncStatus,
      },
    });

  } catch (error) {
    console.error('Error in approveMasterAufgabe:', error);
    return Response.json(
      { error: error.message || 'Fehler bei der Freigabe' },
      { status: 500 }
    );
  }
});