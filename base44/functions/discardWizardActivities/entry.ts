/**
 * functions/discardWizardActivities
 *
 * Aufgabeneditor Etappe 1 (2026-07-27): "Abbrechen"-Pfad des Aufgabeneditors.
 *
 * Löscht die in DIESER Editor-Sitzung neu angelegten Aktivitäts-Hüllen
 * wieder (inkl. zugehöriger Master-Aufgaben), wenn die Lehrkraft die
 * Änderungen verwirft statt sie zu speichern.
 *
 * Sicherheitsleitplanken:
 *   – Aufrufer MUSS den aktiven Lernpaket-Lock halten (wie apply).
 *   – Gelöscht wird NUR, was nachweislich gefahrlos ist:
 *     sync_status === 'new' (nie exportiert), content_status === 'draft'
 *     (nie freigegeben) und Zugehörigkeit zum angegebenen Lernpaket.
 *   – Harte Löschung (kein Tombstone), da die Einträge nie in einem
 *     Export-Lauf waren.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_IDS = 50;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { lernpaketId, activityIds } = body || {};

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId ist erforderlich' }, { status: 400 });
    }
    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return Response.json({ error: 'activityIds darf nicht leer sein' }, { status: 400 });
    }
    if (activityIds.length > MAX_IDS) {
      return Response.json({ error: `Zu viele activityIds (max. ${MAX_IDS})` }, { status: 400 });
    }

    // Lernpaket + Lock-Ownership prüfen (identisch zu applyLernpaketWizardProposal).
    const pakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: lernpaketId }).catch(() => []);
    const paket = pakete?.[0];
    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }
    const lockAgeMs = paket.locked_at
      ? Date.now() - new Date(paket.locked_at).getTime()
      : Infinity;
    const lockHeldByMe =
      paket.is_locked === true &&
      paket.locked_by_email === user.email &&
      lockAgeMs < LOCK_TIMEOUT_MS;
    if (!lockHeldByMe) {
      return Response.json(
        { error: 'Kein aktiver Lernpaket-Lock. Bitte zuerst Bearbeitungsmodus starten.', code: 'LOCK_NOT_HELD' },
        { status: 409 }
      );
    }

    // Kandidaten laden und gegen die Leitplanken prüfen.
    const deleted = [];
    const skipped = [];
    for (const id of activityIds) {
      const rows = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ id }).catch(() => []);
      const act = rows?.[0];
      if (!act) {
        skipped.push({ id, grund: 'nicht gefunden' });
        continue;
      }
      if (act.lernpaket_id !== lernpaketId) {
        skipped.push({ id, grund: 'gehört nicht zu diesem Lernpaket' });
        continue;
      }
      if (act.sync_status !== 'new' || act.content_status === 'approved') {
        skipped.push({ id, grund: 'bereits exportiert oder freigegeben' });
        continue;
      }
      // Zugehörige Master-Aufgaben mitlöschen.
      const masters = await base44.asServiceRole.entities.MasterAufgabe.filter({ activity_id: id }, undefined, 200);
      for (const m of masters || []) {
        await base44.asServiceRole.entities.MasterAufgabe.delete(m.id);
      }
      await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.delete(id);
      deleted.push(id);
    }

    console.info(
      `[discardWizardActivities] paket=${lernpaketId} user=${user.email} deleted=${deleted.length} skipped=${skipped.length}`
    );

    return Response.json({ success: true, deleted, skipped });
  } catch (error) {
    console.error('[discardWizardActivities] error', error);
    return Response.json({ error: error.message || 'Discard failed' }, { status: 500 });
  }
}