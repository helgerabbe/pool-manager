/**
 * lernpaketLock
 * ─────────────
 * Verwaltet Content-Locks auf Lernpaket-Ebene.
 *
 * Zusätzliche Sicherheitsprüfungen (Race-Condition-Schutz):
 * 1. lock-Aktion: Prüft ob ein Structural Lock auf der übergeordneten Einheit aktiv ist.
 *    → Falls ja: Lock wird verweigert mit HTTP 423 (Locked).
 * 2. heartbeat: Prüft ob themenfeld_id des Pakets noch existiert.
 *    → Falls nicht: Lock wird freigegeben, Nutzer erhält Warnung.
 * 3. Alle Update-Aktionen: Validieren einheit_id + themenfeld_id-Existenz.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOCK_TIMEOUT_MS       = 2 * 60 * 1000;  // 2 Min (Content-Lock, aligned with Aktivitäten)
const STRUCT_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min (Structural Lock)

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ── RBAC: Nur schreibberechtigte Rollen dürfen Locks setzen ─────────────────
  const SCHREIB_ROLLEN = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft'];
  const userProfile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const userRolle = userProfile?.[0]?.rolle;
  if (!userRolle || !SCHREIB_ROLLEN.includes(userRolle)) {
    return Response.json({ error: 'Keine Schreibberechtigung für diese Rolle' }, { status: 403 });
  }

  const body = await req.json();
  const { action, paket_id } = body;

  if (!paket_id || !action) {
    return Response.json({ error: 'paket_id und action sind erforderlich' }, { status: 400 });
  }

  // ── Paket laden ──────────────────────────────────────────────────────────────
  const pakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: paket_id });
  const paket = pakete?.[0];
  if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

  // ── Race-Condition-Check: einheit_id muss existieren ─────────────────────────
  if (paket.einheit_id) {
    const einheiten = await base44.asServiceRole.entities.Einheiten.filter({ id: paket.einheit_id });
    if (!einheiten?.[0]) {
      // Einheit gelöscht → Lock freigeben und abbrechen
      if (paket.locked_by) {
        await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
          locked_by: null, locked_at: null,
        }).catch(() => {});
      }
      return Response.json({
        error: 'Die übergeordnete Einheit existiert nicht mehr.',
        stale: true,
      }, { status: 410 });
    }
  }

  // ── LOCK-Aktion ───────────────────────────────────────────────────────────────
  if (action === 'lock') {

    // Structural-Lock-Prüfung: Ist die Einheit strukturell gesperrt?
    if (paket.einheit_id) {
      const einheiten = await base44.asServiceRole.entities.Einheiten.filter({ id: paket.einheit_id });
      const einheit = einheiten?.[0];
      if (einheit?.structural_lock && einheit.structural_lock !== user.email) {
        const lockedAt = einheit.structural_locked_at
          ? new Date(einheit.structural_locked_at).getTime() : 0;
        const isExpired = Date.now() - lockedAt > STRUCT_LOCK_TIMEOUT_MS;
        if (!isExpired) {
          return Response.json({
            success: false,
            structural_lock: true,
            locked_by: einheit.structural_lock,
            message: `Die Struktur der Einheit wird gerade von ${einheit.structural_lock} angepasst. Neue Inhalts-Bearbeitungen sind kurzzeitig gesperrt.`,
          }, { status: 423 }); // 423 Locked
        }
        // Expired → Structural Lock bereinigen
        await base44.asServiceRole.entities.Einheiten.update(paket.einheit_id, {
          structural_lock: null,
          structural_locked_at: null,
        }).catch(() => {});
      }
    }

    // Content-Lock-Prüfung: Ist das Paket von jemand anderem gesperrt?
    if (paket.locked_by_user && paket.locked_by_user !== user.email) {
      const lockedAt = paket.locked_at ? new Date(paket.locked_at).getTime() : 0;
      const isExpired = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
      if (!isExpired) {
        return Response.json({
          success: false,
          locked_by: paket.locked_by_user,
          message: `Dieses Paket wird gerade von ${paket.locked_by_user} bearbeitet.`,
        }, { status: 409 });
      }
    }

    // Optimistic Locking: Version inkrementieren
    const currentVersion = paket.lock_version ?? 0;
    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      lock_status: true,
      locked_by_user: user.email,
      locked_at: new Date().toISOString(),
      lock_version: currentVersion + 1,
    });
    return Response.json({ success: true, locked_by: user.email, lock_version: currentVersion + 1 });
  }

  // ── UNLOCK-Aktion ─────────────────────────────────────────────────────────────
  if (action === 'unlock') {
    if (paket.locked_by_user && paket.locked_by_user !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
    }
    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      lock_status: false,
      locked_by_user: null,
      locked_at: null,
    });
    return Response.json({ success: true });
  }

  // ── HEARTBEAT-Aktion ──────────────────────────────────────────────────────────
  if (action === 'heartbeat') {
    if (paket.locked_by_user !== user.email) {
      return Response.json({ error: 'Kein Lock vorhanden' }, { status: 403 });
    }

    // Race-Condition-Check: themenfeld_id noch gültig?
    let themenfeldWarning = null;
    if (paket.themenfeld_id) {
      const themenfelder = await base44.asServiceRole.entities.Themenfeld.filter({
        id: paket.themenfeld_id,
      });
      if (!themenfelder?.[0]) {
        themenfeldWarning = 'Das Themenfeld dieses Pakets wurde entfernt.';
      }
    }

    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      locked_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      warning: themenfeldWarning,
    });
  }

  return Response.json({ error: 'Unbekannte Aktion' }, { status: 400 });
});