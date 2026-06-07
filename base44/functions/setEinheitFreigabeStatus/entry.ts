/**
 * setEinheitFreigabeStatus
 *
 * Phase A+B: schaltet das neue Feld `export_lifecycle_status` einer Einheit
 * zwischen 'draft' ↔ 'final_freigegeben' um.
 *
 * Payload:
 *   { einheitId: string, newStatus: 'final_freigegeben' | 'draft' }
 *
 * Verhalten:
 *   - newStatus === 'final_freigegeben' (LOCK):
 *       * Alle 4 Lerntyp-Dashboards müssen mindestens einen Membership-Eintrag
 *         mit pfad_status='locked_for_export' haben.
 *       * Pre-Flight: KEINE aktiven Edit-Locks (Aufgaben, Lernpakete,
 *         Master-Aufgaben, Structural-Lock) — sonst 409 mit Bearbeiter-Liste.
 *       * Erlaubt für Administrator + Fachschaftsleitung (Fach der Einheit).
 *   - newStatus === 'draft' (UNDO):
 *       * Nur erlaubt, solange aktueller Status 'final_freigegeben' ist —
 *         sobald das Export-Center 'Export starten' geklickt hat
 *         (export_lifecycle_status='export_running'), ist das Aufheben in
 *         der Einheit gesperrt (409 EXPORT_ALREADY_STARTED).
 *       * Erlaubt für Administrator + Fachschaftsleitung (Fach der Einheit).
 *
 * Antwort: { ok: true, newStatus, changed_at, changed_by }
 * Fehler:  { error, code?, ... }   (Status 400/403/404/409/500)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function logAuditEvent(base44, event) {
  try {
    if (!event.user || !event.action || !event.resource || !event.resourceId || !event.status) {
      return;
    }
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      ip_address: event.ip || null,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

// Synchron halten mit src/lib/exportLifecycle.js (NO LOCAL IMPORTS).
const STATUS_DRAFT = 'draft';
const STATUS_FINAL = 'final_freigegeben';
const STATUS_EXPORT_RUNNING = 'export_running';
const STATUS_PUBLISHED = 'published';
const VALID_TARGET_STATUS = [STATUS_FINAL, STATUS_DRAFT];

const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_LOCKED = 'locked_for_export';
const STALE_LOCK_MINUTES = 60;
const PAGE_SIZE = 500;
const FILTER_CHUNK_SIZE = 50;

const ROLLEN = { ADMIN: 'Administrator', FACHSCHAFT: 'Fachschaftsleitung' };
function isAdmin(authUser, profil) {
  if (authUser?.role === 'Administrator' || authUser?.role === 'admin') return true;
  return profil?.rolle === ROLLEN.ADMIN;
}
function isFachschaftFuerFach(profil, fach) {
  if (profil?.rolle !== ROLLEN.FACHSCHAFT) return false;
  const faecher = Array.isArray(profil.fachbereich_zustaendigkeit)
    ? profil.fachbereich_zustaendigkeit
    : [];
  return faecher.includes(fach);
}

function isLockActive(lockedAt) {
  if (!lockedAt) return false;
  const ts = new Date(lockedAt).getTime();
  if (isNaN(ts)) return false;
  return Date.now() - ts < STALE_LOCK_MINUTES * 60 * 1000;
}

async function listAllByFilter(entity, query, sort = 'created_date') {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function filterInChunks(entity, fieldName, values, extraQuery = {}) {
  const results = [];
  for (const chunk of chunkArray(values, FILTER_CHUNK_SIZE)) {
    const page = await listAllByFilter(entity, {
      ...extraQuery,
      [fieldName]: { $in: chunk },
    });
    results.push(...page);
  }
  return results;
}

/**
 * Sammelt alle aktiven Edit-Locks einer Einheit. Identisch zu
 * preflightFinalRelease — bewusst dupliziert (NO LOCAL IMPORTS).
 */
async function collectActiveLocks(base44, einheit, currentUserEmail) {
  const activeLocks = [];

  const aufgaben = await listAllByFilter(base44.asServiceRole.entities.AllgemeineAufgabe, {
    einheit_id: einheit.id,
  });
  for (const a of aufgaben || []) {
    if (a.locked_by && isLockActive(a.locked_at)) {
      activeLocks.push({
        scope: 'aufgabe',
        id: a.id,
        titel: a.titel || '(ohne Titel)',
        user_email: a.locked_by,
        locked_at: a.locked_at || null,
      });
    }
  }

  // Lernpakete: DB-seitig über die zwei möglichen FK-Pfade laden, statt
  // alle Lernpakete der Instanz zu materialisieren. Das alte `Lernpakete.list()`
  // skalierte mit der Gesamtmenge — neu skaliert es mit der Einheit selbst.
  const themenfelder = await listAllByFilter(base44.asServiceRole.entities.Themenfeld, {
    einheit_id: einheit.id,
  });
  const themenfeldIds = (themenfelder || []).map((t) => t.id);
  const [lpByEinheit, lpByThemenfeld] = await Promise.all([
    listAllByFilter(base44.asServiceRole.entities.Lernpakete, { einheit_id: einheit.id }),
    themenfeldIds.length > 0
      ? filterInChunks(base44.asServiceRole.entities.Lernpakete, 'themenfeld_id', themenfeldIds)
      : Promise.resolve([]),
  ]);
  const lernpaketeMap = new Map();
  for (const lp of [...(lpByEinheit || []), ...(lpByThemenfeld || [])]) {
    lernpaketeMap.set(lp.id, lp);
  }
  const lernpakete = Array.from(lernpaketeMap.values());
  const lernpaketIds = new Set(lernpakete.map((lp) => lp.id));
  for (const lp of lernpakete) {
    if (lp.is_locked && lp.locked_by_email && isLockActive(lp.locked_at)) {
      activeLocks.push({
        scope: 'lernpaket',
        id: lp.id,
        titel: lp.titel_des_pakets || '(unbenanntes Paket)',
        user_email: lp.locked_by_email,
        locked_at: lp.locked_at || null,
      });
    }
  }

  if (lernpaketIds.size > 0) {
    // MasterAufgaben: DB-seitig auf die Pakete dieser Einheit eingrenzen
    // statt globaler Liste — vermeidet Speicher- und Latenz-Spitzen bei
    // wachsender Master-Anzahl.
    const masters = await filterInChunks(
      base44.asServiceRole.entities.MasterAufgabe,
      'lernpaket_id',
      Array.from(lernpaketIds)
    );
    for (const m of masters || []) {
      if (!m.lock_status || !m.locked_by_user) continue;
      if (!isLockActive(m.locked_at)) continue;
      activeLocks.push({
        scope: 'master_aufgabe',
        id: m.id,
        titel: m.titel || '(Master-Aufgabe)',
        user_email: m.locked_by_user,
        locked_at: m.locked_at || null,
      });
    }
  }

  if (
    einheit.structural_lock &&
    einheit.structural_lock !== currentUserEmail &&
    isLockActive(einheit.structural_locked_at)
  ) {
    activeLocks.push({
      scope: 'structural',
      id: einheit.id,
      titel: 'Strukturbearbeitung der Einheit',
      user_email: einheit.structural_lock,
      locked_at: einheit.structural_locked_at || null,
    });
  }

  return activeLocks;
}

/**
 * Lebenszyklus-Wechsel beim Final-Freigeben / Aufheben.
 *
 * Setzt den Moodle-Lebenszyklus (`sync_status`) aller Inhalte der Einheit:
 *   - Final freigeben (draft → final_freigegeben): 'new' → 'pending' ("Im Export")
 *   - Aufheben (final_freigegeben → draft):        'pending' → 'new' ("Neu")
 *
 * Nur diese eine Übergangs-Kante wird angefasst. Bereits 'synced',
 * 'modified' oder 'to_delete' bleiben unberührt — dort hat der echte
 * Moodle-Export bzw. eine spätere Änderung schon einen anderen Zustand
 * gesetzt, den wir nicht überschreiben dürfen.
 *
 * Betroffene Entities (alle mit `sync_status`):
 *   - Lernpakete            (FK: einheit_id ODER themenfeld_id→einheit)
 *   - AllgemeineAufgabe     (FK: einheit_id) — Ebene 2 + 3 inkl. Projekte
 *   - LernpaketPhaseAktivitaet (FK: lernpaket_id → Pakete der Einheit)
 *   - MasterAufgabe         (FK: lernpaket_id → Pakete der Einheit)
 */
async function transitionSyncStatus(base44, einheit, direction) {
  const fromStatus = direction === 'to_export' ? 'new' : 'pending';
  const toStatus = direction === 'to_export' ? 'pending' : 'new';

  const sr = base44.asServiceRole.entities;

  // Lernpakete der Einheit (zwei FK-Pfade, dedupliziert).
  const themenfelder = await listAllByFilter(sr.Themenfeld, { einheit_id: einheit.id });
  const themenfeldIds = (themenfelder || []).map((t) => t.id);
  const [lpByEinheit, lpByThemenfeld] = await Promise.all([
    listAllByFilter(sr.Lernpakete, { einheit_id: einheit.id }),
    themenfeldIds.length > 0
      ? filterInChunks(sr.Lernpakete, 'themenfeld_id', themenfeldIds)
      : Promise.resolve([]),
  ]);
  const lernpaketeMap = new Map();
  for (const lp of [...(lpByEinheit || []), ...(lpByThemenfeld || [])]) {
    lernpaketeMap.set(lp.id, lp);
  }
  const lernpakete = Array.from(lernpaketeMap.values());
  const lernpaketIds = lernpakete.map((lp) => lp.id);

  // Aufgaben (Ebene 2 + 3) der Einheit.
  const aufgaben = await listAllByFilter(sr.AllgemeineAufgabe, { einheit_id: einheit.id });

  // Aktivitäten + Master über die Pakete der Einheit.
  const [aktivitaeten, masters] = await Promise.all([
    lernpaketIds.length > 0
      ? filterInChunks(sr.LernpaketPhaseAktivitaet, 'lernpaket_id', lernpaketIds)
      : Promise.resolve([]),
    lernpaketIds.length > 0
      ? filterInChunks(sr.MasterAufgabe, 'lernpaket_id', lernpaketIds)
      : Promise.resolve([]),
  ]);

  // Pro Entity-Typ nur die Records anfassen, die exakt auf fromStatus stehen.
  const tasks = [];
  const queueUpdate = (entity, records) => {
    for (const r of records || []) {
      if ((r.sync_status || 'new') === fromStatus) {
        tasks.push(entity.update(r.id, { sync_status: toStatus }));
      }
    }
  };
  queueUpdate(sr.Lernpakete, lernpakete);
  queueUpdate(sr.AllgemeineAufgabe, aufgaben);
  queueUpdate(sr.LernpaketPhaseAktivitaet, aktivitaeten);
  queueUpdate(sr.MasterAufgabe, masters);

  // In moderaten Batches abarbeiten, um Rate-Limits zu schonen.
  const BATCH = 25;
  let changed = 0;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const slice = tasks.slice(i, i + BATCH);
    const results = await Promise.allSettled(slice);
    changed += results.filter((r) => r.status === 'fulfilled').length;
  }
  return changed;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { einheitId, newStatus } = body;
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });
    if (!VALID_TARGET_STATUS.includes(newStatus)) {
      return Response.json({ error: 'invalid newStatus' }, { status: 400 });
    }

    let einheit;
    try {
      einheit = await base44.entities.Einheiten.get(einheitId);
    } catch (_err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // RBAC: Admin oder Fachschaft im Fach.
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = profile?.[0] || null;
    const allowed = isAdmin(user, profil) || isFachschaftFuerFach(profil, einheit.fach);
    if (!allowed) {
      return Response.json(
        { error: 'Forbidden: nur Administrator oder Fachschaftsleitung dürfen die Einheit final freigeben.' },
        { status: 403 }
      );
    }

    const currentStatus = einheit.export_lifecycle_status || STATUS_DRAFT;

    if (newStatus === STATUS_FINAL) {
      // 1) Pre-Flight: alle 4 Dashboards geprüft?
      const memberships = await listAllByFilter(
        base44.asServiceRole.entities.LernpfadAufgabeMembership,
        { einheit_id: einheitId }
      );
      const lockedLerntypen = new Set(
        (memberships || []).filter((m) => m.pfad_status === PFAD_LOCKED).map((m) => m.lerntyp)
      );
      const fehlend = VALID_LERNTYPEN.filter((lt) => !lockedLerntypen.has(lt));
      if (fehlend.length > 0) {
        return Response.json(
          {
            error: 'Es sind noch nicht alle 4 Dashboards geprüft.',
            code: 'DASHBOARDS_NOT_ALL_LOCKED',
            fehlende_lerntypen: fehlend,
          },
          { status: 409 }
        );
      }

      // 2) Pre-Flight: keine aktiven Live-Edits.
      const activeLocks = await collectActiveLocks(base44, einheit, user.email);
      if (activeLocks.length > 0) {
        return Response.json(
          {
            error: 'Die Einheit wird gerade von anderen Personen bearbeitet.',
            code: 'ACTIVE_LOCKS',
            activeLocks,
          },
          { status: 409 }
        );
      }

      // 3) State-Übergang nur aus 'draft' erlaubt.
      if (currentStatus !== STATUS_DRAFT) {
        return Response.json(
          {
            error:
              currentStatus === STATUS_FINAL
                ? 'Die Einheit ist bereits final freigegeben.'
                : 'Die Einheit befindet sich bereits im Export — Aufhebung nur über das Export-Center.',
            code:
              currentStatus === STATUS_FINAL
                ? 'ALREADY_FINAL'
                : 'EXPORT_ALREADY_STARTED',
            currentStatus,
          },
          { status: 409 }
        );
      }
    } else if (newStatus === STATUS_DRAFT) {
      // Aufheben: nur, solange Einheit in 'final_freigegeben' ist.
      if (currentStatus === STATUS_EXPORT_RUNNING || currentStatus === STATUS_PUBLISHED) {
        return Response.json(
          {
            error:
              'Der Export wurde bereits gestartet. Aufhebung nur über das Export-Center möglich.',
            code: 'EXPORT_ALREADY_STARTED',
            currentStatus,
          },
          { status: 409 }
        );
      }
      if (currentStatus !== STATUS_FINAL) {
        // Idempotent: bereits draft → no-op, aber kein Fehler.
        return Response.json({
          ok: true,
          newStatus: STATUS_DRAFT,
          changed_at: einheit.export_lifecycle_changed_at || null,
          changed_by: einheit.export_lifecycle_changed_by || null,
          noop: true,
        });
      }
    }

    // ── Update mit Re-Read gegen TOCTOU ─────────────────────────────────
    const latestEinheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    const latestStatus = latestEinheit?.export_lifecycle_status || STATUS_DRAFT;
    if (!latestEinheit || latestStatus !== currentStatus) {
      return Response.json(
        {
          error: 'Der Status wurde zwischenzeitlich geändert. Bitte neu laden.',
          code: 'STATUS_CHANGED',
          currentStatus: latestStatus,
          expectedStatus: currentStatus,
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const update = {
      export_lifecycle_status: newStatus,
      export_lifecycle_changed_at: nowIso,
      export_lifecycle_changed_by: user.email,
    };
    await base44.entities.Einheiten.update(einheitId, update);

    // ── Lebenszyklus-Wechsel der Inhalte ────────────────────────────────
    // Final freigeben → alle "neu"-Inhalte auf "Im Export" (pending) setzen.
    // Aufheben       → die zuvor auf "pending" gesetzten zurück auf "neu".
    // Bewusst NACH dem Einheiten-Update: schlägt der Lebenszyklus-Teil fehl,
    // bleibt der Einheiten-Status maßgeblich (Single Source of Truth für die
    // Sperren); der Badge-Wechsel ist rein kosmetisch und idempotent
    // wiederholbar.
    let lifecycleChanged = 0;
    try {
      lifecycleChanged = await transitionSyncStatus(
        base44,
        einheit,
        newStatus === STATUS_FINAL ? 'to_export' : 'to_new'
      );
    } catch (lifecycleErr) {
      console.error('[setEinheitFreigabeStatus] Lebenszyklus-Wechsel fehlgeschlagen:', lifecycleErr);
    }

    await logAuditEvent(base44, {
      user: user.email,
      action: 'PUBLISH',
      resource: 'Einheiten',
      resourceId: einheitId,
      changes: {
        event:
          newStatus === STATUS_FINAL
            ? 'einheit_final_freigegeben'
            : 'einheit_freigabe_aufgehoben',
        fach: einheit.fach,
        from: currentStatus,
        to: newStatus,
      },
      status: 'success',
    });

    return Response.json({
      ok: true,
      newStatus,
      changed_at: nowIso,
      changed_by: user.email,
      lifecycleChanged,
    });
  } catch (error) {
    console.error('[setEinheitFreigabeStatus] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});