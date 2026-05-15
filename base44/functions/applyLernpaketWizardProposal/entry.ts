/**
 * functions/applyLernpaketWizardProposal
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.5 – §4.6).
 *
 * Persistiert einen vom Wizard generierten und von der Lehrkraft
 * bestätigten Vorschlag (Liste von Aktivitäts-Hüllen + Briefing) auf
 * einem Lernpaket.
 *
 * Zwei Modi:
 *   – mode = 'additive'   → bestehende Aktivitäten bleiben unangetastet,
 *                           neue Hüllen werden ANGEHÄNGT (reihenfolge =
 *                           letzte_reihenfolge_in_phase + 1, +2, …).
 *   – mode = 'overwrite'  → alle bestehenden Aktivitäten dieses Pakets
 *                           werden zu Tombstones (sync_status='to_delete'),
 *                           neue Hüllen werden ab reihenfolge=0 angelegt.
 *
 * Lock-Modell (konsistent zu assignActivityToLernpaket /
 * deleteActivityWithTombstoneAndCascade):
 *   – Aufrufer MUSS aktiven Lernpaket-Lock halten (`is_locked === true`,
 *     `locked_by_email === user.email`, nicht-stale).
 *   – Auf den Lock-Erwerb wird hier bewusst NICHT zugegriffen — das
 *     macht das Frontend via acquireLockSecure vor dem Wizard-Start.
 *
 * Persistenz-Reihenfolge (für saubere Roll-ups):
 *   1. (overwrite) bestehende Aktivitäten tombstonen
 *   2. neue KI-Hüllen inkl. ki_briefing anlegen
 *   3. Lernpaket-Felder updaten (kreativ_briefing, kreativ_briefing_updated_at)
 *
 * @MIGRATION_NOTE Supabase:
 *   Overwrite + Tombstone + Neuanlage muss später als eine SQL-Transaktion
 *   laufen: entweder alle alten Aktivitäten werden tombstoned und alle neuen
 *   angelegt, oder nichts. Außerdem sollten Aktivitäts-Queries paginiert bzw.
 *   mit ausreichenden Limits/Indexes abgesichert werden.
 *
 * Diese Funktion ruft KEINE LLM auf. Sie ist rein deterministisch.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

const VALID_PHASES = new Set(['Input', 'Übung', 'Abschluss']);
const VALID_MODES = new Set(['additive', 'overwrite']);
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_BRIEFING_LENGTH = 5000;

async function logAudit(base44, event) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (err) {
    console.error('[applyLernpaketWizardProposal][AUDIT_ERROR]', err.message);
  }
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      lernpaketId,
      items = [],
      mode = 'additive',
      briefing = null,
    } = body || {};

    // ── 1. Eingaben validieren ────────────────────────────────────────
    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId ist erforderlich' }, { status: 400 });
    }
    if (!VALID_MODES.has(mode)) {
      return Response.json({ error: `Ungültiger mode. Erlaubt: ${[...VALID_MODES].join(', ')}` }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items darf nicht leer sein' }, { status: 400 });
    }
    if (briefing != null && typeof briefing !== 'string') {
      return Response.json({ error: 'briefing muss String oder null sein' }, { status: 400 });
    }
    if (typeof briefing === 'string' && briefing.length > MAX_BRIEFING_LENGTH) {
      return Response.json({ error: `briefing zu lang (max. ${MAX_BRIEFING_LENGTH})` }, { status: 400 });
    }

    // ── 2. Lernpaket laden ────────────────────────────────────────────
    const pakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: lernpaketId });
    const paket = pakete?.[0];
    if (!paket) {
      return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });
    }

    // ── 3. Lock-Ownership prüfen (zwingend) ───────────────────────────
    const lockAgeMs = paket.locked_at
      ? Date.now() - new Date(paket.locked_at).getTime()
      : Infinity;
    const lockHeldByMe =
      paket.is_locked === true &&
      paket.locked_by_email === user.email &&
      lockAgeMs < LOCK_TIMEOUT_MS;

    if (!lockHeldByMe) {
      return Response.json(
        {
          error: 'Kein aktiver Lernpaket-Lock. Bitte zuerst Bearbeitungsmodus starten.',
          code: 'LOCK_NOT_HELD',
          currentLock: paket.locked_by_email || null,
        },
        { status: 409 }
      );
    }

    // ── 4. Items gegen Katalog auflösen (Name → aktivitaet_id) ───────
    // Der Wizard sendet Items mit `aktivitaetstyp` (Name) + `phase`.
    // Wir resolven gegen den aktiven Katalog, damit ungültige Namen
    // hier abgefangen werden (defense-in-depth).
    const katalogAlle = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    const aktiverKatalog = katalogAlle.filter((k) => k.is_active === true);
    const katalogByName = new Map(aktiverKatalog.map((k) => [k.name, k]));

    const resolved = [];
    const rejected = [];
    items.forEach((it, idx) => {
      if (!it || typeof it !== 'object') {
        rejected.push({ index: idx, grund: 'kein Objekt' });
        return;
      }
      if (!VALID_PHASES.has(it.phase)) {
        rejected.push({ index: idx, grund: 'ungültige phase', wert: it.phase });
        return;
      }
      const katalogEintrag = katalogByName.get(it.aktivitaetstyp);
      if (!katalogEintrag) {
        rejected.push({ index: idx, grund: 'unbekannter aktivitaetstyp', wert: it.aktivitaetstyp });
        return;
      }
      resolved.push({
        phase: it.phase,
        aktivitaet_id: katalogEintrag.id,
        aktivitaet_name: katalogEintrag.name,
        ki_briefing: it.ki_briefing_skizze || null,
      });
    });

    if (resolved.length === 0) {
      return Response.json(
        { error: 'Keine gültigen Items im Vorschlag', rejected },
        { status: 400 }
      );
    }

    // ── 5. Mode 'overwrite': bestehende Aktivitäten tombstonen ───────
    let tombstonedCount = 0;
    if (mode === 'overwrite') {
      const bestehende = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: lernpaketId,
      }, undefined, 1000);
      // Nur die, die noch nicht Tombstone sind
      const zuTombstonen = bestehende.filter((a) => a.sync_status !== 'to_delete');
      await Promise.all(
        zuTombstonen.map((a) =>
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(a.id, {
            sync_status: 'to_delete',
          })
        )
      );
      tombstonedCount = zuTombstonen.length;
    }

    // ── 6. Reihenfolge-Basis pro Phase ermitteln ─────────────────────
    // Im Overwrite-Modus: ab 0. Im Additive-Modus: nach dem letzten
    // existierenden, NICHT-tombstoned Eintrag in dieser Phase.
    const reihenfolgeBasis = { Input: 0, 'Übung': 0, Abschluss: 0 };
    if (mode === 'additive') {
      const bestehende = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: lernpaketId,
      }, undefined, 1000);
      bestehende
        .filter((a) => a.sync_status !== 'to_delete')
        .forEach((a) => {
          const r = typeof a.reihenfolge === 'number' ? a.reihenfolge : 0;
          if (a.phase in reihenfolgeBasis && r + 1 > reihenfolgeBasis[a.phase]) {
            reihenfolgeBasis[a.phase] = r + 1;
          }
        });
    }

    // ── 7. Neue Hüllen anlegen ───────────────────────────────────────
    // Reihenfolge wird PRO PHASE inkrementell vergeben, in der
    // Reihenfolge, in der die Items im Vorschlag stehen.
    const phaseCounter = { Input: 0, 'Übung': 0, Abschluss: 0 };
    const createdActivities = [];
    const createErrors = [];

    for (const r of resolved) {
      const reihenfolge = reihenfolgeBasis[r.phase] + phaseCounter[r.phase];
      phaseCounter[r.phase] += 1;
      try {
        const created = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.create({
          lernpaket_id: lernpaketId,
          aktivitaet_id: r.aktivitaet_id,
          phase: r.phase,
          reihenfolge,
          field_values: {},
          is_complete: false,
          content_status: 'draft',
          sync_status: 'new',
          erstellungs_modus: 'ki',
          ki_briefing: r.ki_briefing,
        });
        createdActivities.push({ id: created.id, phase: r.phase, name: r.aktivitaet_name });
      } catch (err) {
        createErrors.push({ name: r.aktivitaet_name, error: err.message });
      }
    }

    // ── 8. Lernpaket-Felder updaten (Briefing + Zeitstempel) ─────────
    const lernpaketUpdates = {};
    if (typeof briefing === 'string') {
      lernpaketUpdates.kreativ_briefing = briefing;
      lernpaketUpdates.kreativ_briefing_updated_at = new Date().toISOString();
    }
    if (Object.keys(lernpaketUpdates).length > 0) {
      await base44.asServiceRole.entities.Lernpakete.update(lernpaketId, lernpaketUpdates);
    }

    // ── 9. Audit ─────────────────────────────────────────────────────
    await logAudit(base44, {
      user: user.email,
      action: 'UPDATE',
      resource: 'Lernpakete',
      resourceId: lernpaketId,
      changes: {
        wizard_apply: true,
        mode,
        items_created: createdActivities.length,
        items_rejected: rejected.length,
        items_tombstoned: tombstonedCount,
        briefing_updated: typeof briefing === 'string',
      },
      affectedCount: createdActivities.length + tombstonedCount,
      status: createErrors.length === 0 ? 'success' : 'failed',
      errorMessage: createErrors.length > 0 ? createErrors.map((e) => e.error).join('; ') : null,
    });

    console.info(
      `[applyLernpaketWizardProposal] paket=${lernpaketId} mode=${mode} ` +
      `created=${createdActivities.length} tombstoned=${tombstonedCount} ` +
      `rejected=${rejected.length} duration=${Date.now() - t0}ms`
    );

    return Response.json({
      success: true,
      stats: {
        mode,
        items_created: createdActivities.length,
        items_tombstoned: tombstonedCount,
        items_rejected: rejected.length,
      },
      createdActivities,
      rejected,
      createErrors: createErrors.length > 0 ? createErrors : undefined,
    });
  } catch (error) {
    console.error('[applyLernpaketWizardProposal] error', error);
    return Response.json({ error: error.message || 'Apply failed' }, { status: 500 });
  }
});