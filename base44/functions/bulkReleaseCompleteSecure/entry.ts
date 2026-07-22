/**
 * bulkReleaseCompleteSecure
 *
 * Sammel-Freigabe für das Freigabe-Cockpit (2026-07-22):
 * Prüft alle Inhalte einer Einheit (Aktivitäten in Lernpaketen, Allgemeine
 * Aufgaben/Projekte, Lernpakete) deterministisch auf Vollständigkeit —
 * mit exakt denselben Regeln wie setReleaseStatusSecure (shared/freigabeShared)
 * — und kann alle vollständigen, noch nicht freigegebenen Elemente in einem
 * Rutsch freigeben.
 *
 * Typischer Anwendungsfall: Eine private Einheit wurde zur Poolzeit-Einheit
 * gemacht (setEinheitSichtbarkeitSecure setzt dabei alle Freigaben zurück).
 * Die Fachschaftsleitung prüft im Cockpit und gibt gesammelt frei.
 *
 * Parameter:
 *   { einheit_id: string, action: 'check' | 'release' }
 *
 * Response (check):
 *   { success, freigebbar: [{type,id,titel}], unvollstaendig: [{type,id,titel,missing}], bereitsFreigegeben }
 * Response (release):
 *   { success, releasedCount, errors: [{id,titel,error}] }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  EINHEIT_LOCKING_LIFECYCLES,
  listAllByFilter,
  validateActivityCompleteness,
  validateAllgemeineAufgabeCompleteness,
  checkUserCanEditEinheit,
} from '../../shared/freigabeShared.js';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { einheit_id, action = 'check' } = body;
    if (!einheit_id) return Response.json({ error: 'einheit_id ist erforderlich' }, { status: 400 });
    if (!['check', 'release'].includes(action)) {
      return Response.json({ error: 'Ungültige action (check|release)' }, { status: 400 });
    }

    // ---- Einheit + RBAC
    const einheit = await base44.entities.Einheiten.get(einheit_id).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden oder nicht zugänglich' }, { status: 404 });

    const auth = await checkUserCanEditEinheit(base44, user, einheit);
    if (!auth.allowed) {
      return Response.json(
        { error: 'Keine Berechtigung', code: 'INSUFFICIENT_PERMISSIONS', reason: auth.reason },
        { status: 403 }
      );
    }

    if (EINHEIT_LOCKING_LIFECYCLES.has(einheit.export_lifecycle_status)) {
      return Response.json(
        { error: 'Einheit ist final freigegeben — Änderungen am Freigabe-Status nicht möglich', code: 'EINHEIT_FINAL_LOCKED' },
        { status: 423 }
      );
    }

    // ---- Datengrundlage laden
    const sr = base44.asServiceRole.entities;
    const [pakete, aufgaben, katalog, memberships] = await Promise.all([
      listAllByFilter(sr.Lernpakete, { einheit_id }),
      listAllByFilter(sr.AllgemeineAufgabe, { einheit_id }),
      listAllByFilter(sr.AktivitaetenKatalog, {}),
      listAllByFilter(sr.LernpfadAufgabeMembership, { einheit_id }),
    ]);
    const katalogById = new Map(katalog.map((k) => [k.id, k]));
    const dashboardLocked = new Set(
      memberships.filter((m) => m.pfad_status === 'locked_for_export').map((m) => m.aufgabe_id)
    );

    const aktivPakete = pakete.filter((p) => p.sync_status !== 'to_delete');
    const aktivitaetenNested = await Promise.all(
      aktivPakete.map((p) => listAllByFilter(sr.LernpaketPhaseAktivitaet, { lernpaket_id: p.id }))
    );

    // ---- Vollständigkeit prüfen
    const freigebbar = [];
    const unvollstaendig = [];
    let bereitsFreigegeben = 0;
    const releasableActivityIds = new Set();
    const activeActsByPaket = new Map();

    aktivPakete.forEach((p, idx) => {
      const phasenConf = p.phasen_konfiguration || {};
      const acts = (aktivitaetenNested[idx] || []).filter(
        (a) => a.sync_status !== 'to_delete' && phasenConf[a.phase]?.disabled !== true
      );
      activeActsByPaket.set(p.id, acts);
      for (const a of acts) {
        const cat = katalogById.get(a.aktivitaet_id);
        const label = `${cat?.name || 'Aktivität'} (${a.phase}) — ${p.titel_des_pakets}`;
        if (a.content_status === 'approved') {
          bereitsFreigegeben++;
          continue;
        }
        const v = validateActivityCompleteness(cat, a.field_values || {});
        if (v.isComplete) {
          freigebbar.push({ type: 'activity', id: a.id, titel: label });
          releasableActivityIds.add(a.id);
        } else {
          unvollstaendig.push({ type: 'activity', id: a.id, titel: label, missing: v.missingFields });
        }
      }
    });

    for (const a of aufgaben) {
      if (a.sync_status === 'to_delete') continue;
      const label = a.titel || 'Aufgabe ohne Titel';
      if (a.content_status === 'approved') {
        bereitsFreigegeben++;
        continue;
      }
      const v = validateAllgemeineAufgabeCompleteness(a);
      if (v.isComplete) {
        freigebbar.push({ type: 'allgemeine_aufgabe', id: a.id, titel: label });
      } else {
        unvollstaendig.push({ type: 'allgemeine_aufgabe', id: a.id, titel: label, missing: v.missingFields });
      }
    }

    // Lernpakete: freigebbar, wenn alle aktiven Aktivitäten bereits freigegeben
    // sind ODER in diesem Lauf freigegeben würden — und kein Dashboard-Lock
    // besteht. Leere Pakete werden bewusst nicht automatisch freigegeben.
    for (const p of aktivPakete) {
      if (p.content_status === 'approved' && p.released_at) {
        bereitsFreigegeben++;
        continue;
      }
      const acts = activeActsByPaket.get(p.id) || [];
      if (acts.length === 0) continue;
      if (dashboardLocked.has(p.id)) continue;
      const allApproved = acts.every(
        (a) => a.content_status === 'approved' || releasableActivityIds.has(a.id)
      );
      if (allApproved) {
        freigebbar.push({ type: 'lernpaket', id: p.id, titel: p.titel_des_pakets || 'Lernpaket' });
      }
      // Unvollständige Pakete werden nicht separat gelistet — die blockierenden
      // Aktivitäten stehen bereits einzeln in `unvollstaendig`.
    }

    if (action === 'check') {
      return Response.json({ success: true, action, freigebbar, unvollstaendig, bereitsFreigegeben });
    }

    // ---- action === 'release': erst Aktivitäten & Aufgaben, dann Lernpakete
    const now = new Date().toISOString();
    const releasePatch = { content_status: 'approved', released_at: now, released_by: user.email };
    const entMap = {
      activity: 'LernpaketPhaseAktivitaet',
      allgemeine_aufgabe: 'AllgemeineAufgabe',
      lernpaket: 'Lernpakete',
    };
    const errors = [];
    let releasedCount = 0;

    const releaseItems = async (items) => {
      const results = await Promise.allSettled(
        items.map((item) => {
          // is_complete mitschreiben (analog setReleaseStatusSecure): die
          // Vollständigkeit ist oben ehrlich geprüft; sonst bliebe die
          // Dashboard-Ampel fälschlich rot.
          const patch = item.type === 'allgemeine_aufgabe' ? releasePatch : { ...releasePatch, is_complete: true };
          return base44.entities[entMap[item.type]].update(item.id, patch);
        })
      );
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') releasedCount++;
        else errors.push({ id: items[i].id, titel: items[i].titel, error: r.reason?.message || 'Update fehlgeschlagen' });
      });
    };

    await releaseItems(freigebbar.filter((f) => f.type !== 'lernpaket'));
    await releaseItems(freigebbar.filter((f) => f.type === 'lernpaket'));

    // ---- Audit-Log
    try {
      await sr.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheit_id,
        changes: {
          action_code: 'BULK_RELEASE',
          releasedCount,
          errorCount: errors.length,
          rolle: auth.rolle,
        },
        affected_count: releasedCount,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[bulkReleaseCompleteSecure] Audit log failed:', auditErr);
    }

    return Response.json({ success: true, action, releasedCount, errors });
  } catch (error) {
    console.error('[bulkReleaseCompleteSecure] Unexpected error:', error);
    return Response.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
});