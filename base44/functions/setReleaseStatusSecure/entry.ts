/**
 * setReleaseStatusSecure.js
 *
 * Phase 3 des Freigabe-Konzepts (2026-05-14):
 * Zentrale Backend-Funktion, um den Freigabe-Status einer Aktivität,
 * eines Lernpakets oder einer AllgemeineAufgabe (inkl. Projekt) zu
 * setzen oder zurückzunehmen.
 *
 * Regeln (vgl. lib/releaseLockCheck.js):
 * 1. Wenn Einheit final freigegeben ist (`export_lifecycle_status` ∈
 *    {final_freigegeben, export_running, published}) → IMMER 423.
 * 2. Wenn Lernpaket-Eltern released ist und das Ziel eine Activity ist
 *    → 423 (erst Lernpaket-Freigabe zurücknehmen).
 * 3. Beim Freigeben (release=true) muss `is_complete=true` sein
 *    (ehrlich berechnet, kein Vertrauen ins Frontend).
 * 4. Bei Lernpaket-Freigabe müssen alle aktiven Activities
 *    `content_status='approved'` + `is_complete=true` sein.
 * 5. Zurücknahme (release=false) ist immer erlaubt, solange Punkt 1 + 2
 *    nicht greift. Setzt `released_at`/`released_by` auf null.
 *
 * Parameter:
 *   { targetType: 'activity' | 'lernpaket' | 'allgemeine_aufgabe',
 *     targetId: string,
 *     release: boolean }
 *
 * Response:
 *   200 → { success, targetType, targetId, content_status, released_at, released_by }
 *   400/403/404/422/423 mit Code + Details
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const EINHEIT_LOCKING_LIFECYCLES = new Set([
  'final_freigegeben',
  'export_running',
  'published',
]);

// ---------------------------------------------------------------------------
// Inline-Validierung (Kopie der Public-Lib für Backend-Isolation).
// Synchron halten mit lib/completenessValidation.js!
// ---------------------------------------------------------------------------

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function validateJsonStruct(fieldName, data) {
  if (!data || typeof data !== 'object') return 'Inhalt fehlt';
  switch (fieldName) {
    case 'match_data': {
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const valid = pairs.filter(p => p && String(p.left || '').trim() !== '' && String(p.right || '').trim() !== '');
      return valid.length < 3 ? `Mindestens 3 vollständige Paare (aktuell: ${valid.length})` : null;
    }
    case 'mc_data': {
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (qs.length < 1) return 'Mindestens 1 Frage';
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (!q || isEmpty(q.text)) return `Frage ${i + 1}: Text fehlt`;
        const ans = Array.isArray(q.answers) ? q.answers.filter(a => a && !isEmpty(a.text)) : [];
        if (ans.length < 2) return `Frage ${i + 1}: Mindestens 2 Antworten`;
        if (!ans.some(a => a.correct === true)) return `Frage ${i + 1}: Mindestens 1 richtige Antwort markieren`;
      }
      return null;
    }
    case 'lueckentext_data': {
      if (isEmpty(data.text)) return 'Text fehlt';
      const gaps = Array.isArray(data.gaps) ? data.gaps : [];
      const valid = gaps.filter(g => g && !isEmpty(g.correct));
      return valid.length < 1 ? 'Mindestens 1 Lücke mit Lösung' : null;
    }
    case 'answer_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      const valid = qs.filter(q => q && !isEmpty(q.frage || q.text) && !isEmpty(q.antwort || q.korrekt));
      return valid.length < 3 ? `Mindestens 3 vollständige Fragen (aktuell: ${valid.length})` : null;
    }
    case 'sort_data': {
      const items = Array.isArray(data.items) ? data.items : [];
      const valid = items.filter(it => it && !isEmpty(it.text));
      return valid.length < 3 ? `Mindestens 3 Sortier-Elemente (aktuell: ${valid.length})` : null;
    }
    case 'marker_data': {
      const zones = Array.isArray(data.dropzones) ? data.dropzones : [];
      const valid = zones.filter(z => z && !isEmpty(z.label));
      return valid.length < 2 ? `Mindestens 2 beschriftete Drop-Zonen (aktuell: ${valid.length})` : null;
    }
    case 'test_data': {
      const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data.fragen) ? data.fragen : []);
      return qs.length < 1 ? 'Mindestens 1 Frage' : null;
    }
    default:
      return null; // Unbekannter JSON-Feldname → Leer-Check via isEmpty()
  }
}

function validateActivityCompleteness(catalog, fieldValues = {}) {
  if (!catalog || !Array.isArray(catalog.form_schema)) return { isComplete: true, missingFields: [] };
  const missingFields = [];
  for (const field of catalog.form_schema) {
    if (!field || !field.field_name || field.type === 'info' || !field.required) continue;
    const value = fieldValues[field.field_name];
    if (field.type === 'json') {
      const reason = validateJsonStruct(field.field_name, value);
      if (reason) missingFields.push({ fieldName: field.field_name, label: field.label, reason });
    } else if (isEmpty(value)) {
      missingFields.push({ fieldName: field.field_name, label: field.label, reason: 'Pflichtfeld leer' });
    }
  }
  return { isComplete: missingFields.length === 0, missingFields };
}

function validateAllgemeineAufgabeCompleteness(a) {
  if (!a) return { isComplete: false, missingFields: [{ fieldName: '_', reason: 'Keine Aufgabe' }] };
  const missing = [];

  if (a.erstellungs_modus === 'ki') {
    const br = a.ki_briefing || {};
    if (!br.variant) missing.push({ fieldName: 'ki_briefing.variant', reason: 'Variante fehlt' });
    else if (br.variant === 'offen') {
      if (isEmpty(br.offen?.lernziel)) missing.push({ fieldName: 'ki_briefing.offen.lernziel', reason: 'Pflichtfeld leer' });
      if (isEmpty(br.offen?.funktionsweise)) missing.push({ fieldName: 'ki_briefing.offen.funktionsweise', reason: 'Pflichtfeld leer' });
    } else if (br.variant === 'standard') {
      if (isEmpty(br.standard?.schwerpunkt)) missing.push({ fieldName: 'ki_briefing.standard.schwerpunkt', reason: 'Pflichtfeld leer' });
    }
    return { isComplete: missing.length === 0, missingFields: missing };
  }

  switch (a.aufgaben_typ || 'inhalt') {
    case 'inhalt':
    case 'prozess':
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
      break;
    case 'handlung':
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
      if (isEmpty(a.hinweise_zum_material)) missing.push({ fieldName: 'hinweise_zum_material', reason: 'Pflichtfeld leer' });
      break;
    case 'buendel':
      if (!Array.isArray(a.verlinkte_lernpaket_ids) || a.verlinkte_lernpaket_ids.length < 1) {
        missing.push({ fieldName: 'verlinkte_lernpaket_ids', reason: 'Mindestens 1 Lernpaket' });
      }
      break;
    case 'auswahl_buendel':
      if (!Array.isArray(a.verlinkte_aufgaben_ids) || a.verlinkte_aufgaben_ids.length < 2) {
        missing.push({ fieldName: 'verlinkte_aufgaben_ids', reason: 'Mindestens 2 Aufgaben' });
      }
      if (!Number.isInteger(a.erforderliche_anzahl) || a.erforderliche_anzahl < 1) {
        missing.push({ fieldName: 'erforderliche_anzahl', reason: 'Muss ≥ 1 sein' });
      }
      break;
    case 'projekt_anker':
      if (!Array.isArray(a.verlinkte_projekt_ids) || a.verlinkte_projekt_ids.length < 1) {
        missing.push({ fieldName: 'verlinkte_projekt_ids', reason: 'Mindestens 1 Projekt' });
      }
      break;
    default:
      if (isEmpty(a.aufgabenstellung)) missing.push({ fieldName: 'aufgabenstellung', reason: 'Pflichtfeld leer' });
  }

  // Projekt-Zusatzfelder
  if (a.anforderungsebene === '3 - Projekt') {
    if (isEmpty(a.erwartungshorizont)) missing.push({ fieldName: 'erwartungshorizont', reason: 'Pflichtfeld leer' });
    if (isEmpty(a.ergebnis_form)) missing.push({ fieldName: 'ergebnis_form', reason: 'Pflichtfeld leer' });
    if (isEmpty(a.ergebnis_dateiformat)) missing.push({ fieldName: 'ergebnis_dateiformat', reason: 'Pflichtfeld leer' });
  }

  return { isComplete: missing.length === 0, missingFields: missing };
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

async function checkUserCanEditEinheit(base44, user, einheit) {
  const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
  const profil = benutzer[0];
  const rolle = profil?.rolle || 'Betrachter';
  const faecher = profil?.fachbereich_zustaendigkeit || [];

  if (rolle === 'Administrator') return { allowed: true, rolle };
  if (rolle === 'Fachschaftsleitung') {
    return faecher.includes(einheit.fach)
      ? { allowed: true, rolle }
      : { allowed: false, rolle, reason: 'wrong_fach' };
  }
  if (rolle === 'Fachlehrkraft') {
    const ms = await base44.asServiceRole.entities.EinheitMembers.filter({
      einheit_id: einheit.id,
      user_email: user.email,
    });
    const m = ms[0];
    if (m && (m.unit_role === 'LEITUNG' || m.unit_role === 'EDITOR')) {
      return { allowed: true, rolle };
    }
    return { allowed: false, rolle, reason: 'no_delegation' };
  }
  return { allowed: false, rolle, reason: 'insufficient_role' };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetType, targetId, release } = await req.json();
    if (!targetType || !targetId || typeof release !== 'boolean') {
      return Response.json(
        { error: 'targetType, targetId und release sind erforderlich' },
        { status: 400 }
      );
    }
    if (!['activity', 'lernpaket', 'allgemeine_aufgabe'].includes(targetType)) {
      return Response.json({ error: 'Ungültiger targetType', code: 'INVALID_TARGET' }, { status: 400 });
    }

    // ---- Ziel laden + Parents auflösen
    let target = null;
    let einheit = null;
    let lernpaket = null;
    let catalog = null;

    if (targetType === 'activity') {
      const arr = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ id: targetId });
      target = arr[0];
      if (!target) return Response.json({ error: 'Aktivität nicht gefunden' }, { status: 404 });

      const lps = await base44.asServiceRole.entities.Lernpakete.filter({ id: target.lernpaket_id });
      lernpaket = lps[0];
      if (!lernpaket) return Response.json({ error: 'Parent-Lernpaket nicht gefunden' }, { status: 404 });

      const eh = await base44.asServiceRole.entities.Einheiten.filter({ id: lernpaket.einheit_id });
      einheit = eh[0];

      const cat = await base44.asServiceRole.entities.AktivitaetenKatalog.filter({ id: target.aktivitaet_id });
      catalog = cat[0];
    } else if (targetType === 'lernpaket') {
      const arr = await base44.asServiceRole.entities.Lernpakete.filter({ id: targetId });
      target = arr[0];
      if (!target) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

      const eh = await base44.asServiceRole.entities.Einheiten.filter({ id: target.einheit_id });
      einheit = eh[0];
    } else {
      // allgemeine_aufgabe (inkl. Projekt)
      const arr = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({ id: targetId });
      target = arr[0];
      if (!target) return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });

      const eh = await base44.asServiceRole.entities.Einheiten.filter({ id: target.einheit_id });
      einheit = eh[0];
    }

    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // ---- RBAC
    const auth = await checkUserCanEditEinheit(base44, user, einheit);
    if (!auth.allowed) {
      return Response.json(
        { error: 'Keine Berechtigung', code: 'INSUFFICIENT_PERMISSIONS', reason: auth.reason },
        { status: 403 }
      );
    }

    // ---- Sperr-Check: Einheit final?
    if (EINHEIT_LOCKING_LIFECYCLES.has(einheit.export_lifecycle_status)) {
      return Response.json(
        {
          error: 'Einheit ist final freigegeben — Änderungen am Freigabe-Status nicht möglich',
          code: 'EINHEIT_FINAL_LOCKED',
          status: einheit.export_lifecycle_status,
        },
        { status: 423 }
      );
    }

    // ---- Sperr-Check: Lernpaket darf nicht verändert werden, sobald es in einem gesperrten Dashboard liegt
    if (targetType === 'lernpaket') {
      const memberships = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheit.id,
        aufgabe_id: target.id,
      });
      const lockedMembership = (memberships || []).find((m) => m.pfad_status === 'locked_for_export');
      if (lockedMembership) {
        return Response.json(
          {
            error: 'Lernpaket liegt in einem freigegebenen Dashboard — bitte erst das Dashboard entsperren',
            code: 'DASHBOARD_LOCKED',
            lerntyp: lockedMembership.lerntyp,
          },
          { status: 423 }
        );
      }
    }

    // ---- Sperr-Check: bei Activity → Lernpaket-Parent muss offen sein
    if (targetType === 'activity' && lernpaket?.content_status === 'approved' && lernpaket?.released_at) {
      return Response.json(
        {
          error: 'Parent-Lernpaket ist freigegeben — bitte erst Lernpaket-Freigabe zurücknehmen',
          code: 'PARENT_LERNPAKET_RELEASED',
        },
        { status: 423 }
      );
    }

    // ---- Freigabe vs. Rücknahme
    if (release === true) {
      // Vollständigkeitscheck (ehrlich)
      if (targetType === 'activity') {
        const v = validateActivityCompleteness(catalog, target.field_values || {});
        if (!v.isComplete) {
          return Response.json(
            {
              error: 'Aktivität ist nicht vollständig — Freigabe abgelehnt',
              code: 'NOT_COMPLETE',
              missingFields: v.missingFields,
            },
            { status: 422 }
          );
        }
      } else if (targetType === 'allgemeine_aufgabe') {
        const v = validateAllgemeineAufgabeCompleteness(target);
        if (!v.isComplete) {
          return Response.json(
            {
              error: 'Aufgabe ist nicht vollständig — Freigabe abgelehnt',
              code: 'NOT_COMPLETE',
              missingFields: v.missingFields,
            },
            { status: 422 }
          );
        }
      } else if (targetType === 'lernpaket') {
        // Alle aktiven Activities müssen freigegeben sein. Die inhaltliche Vollständigkeit
        // wurde bereits beim Freigeben der einzelnen Aktivität bzw. Master-Aufgabe geprüft.
        const acts = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
          lernpaket_id: target.id,
        });
        const phasenConf = target.phasen_konfiguration || {};
        const active = acts.filter(a => a.sync_status !== 'to_delete' && !(phasenConf[a.phase]?.disabled === true));
        const blocking = active.filter(a => a.content_status !== 'approved');
        if (active.length === 0 || blocking.length > 0) {
          return Response.json(
            {
              error: 'Lernpaket kann nicht freigegeben werden: nicht alle Aktivitäten sind freigegeben',
              code: 'CHILDREN_NOT_RELEASED',
              missingFields: blocking.map(a => ({ fieldName: `activity:${a.id}`, label: a.titel || a.id, reason: 'Aktivität nicht freigegeben' })),
              totalActive: active.length,
              blockingCount: blocking.length,
            },
            { status: 422 }
          );
        }
      }
    }

    // ---- Update durchführen
    const now = new Date().toISOString();
    const updatePayload = release
      ? { content_status: 'approved', released_at: now, released_by: user.email }
      : { content_status: 'draft', released_at: null, released_by: null };

    const entityMap = {
      activity: 'LernpaketPhaseAktivitaet',
      lernpaket: 'Lernpakete',
      allgemeine_aufgabe: 'AllgemeineAufgabe',
    };
    await base44.asServiceRole.entities[entityMap[targetType]].update(target.id, updatePayload);

    // ---- Direkter Roll-up: Wenn eine Activity freigegeben/zurückgenommen wird,
    // Lernpakete.is_complete sofort nachziehen. Sonst bleibt der Freigabe-Button
    // bis zum nächsten Tab-Wechsel oder Automation-Refresh deaktiviert.
    let paketIsComplete = null;
    if (targetType === 'activity' && lernpaket?.id) {
      const siblings = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: lernpaket.id,
      });
      const phasenConf = lernpaket.phasen_konfiguration || {};
      const active = (siblings || []).filter((a) =>
        a.sync_status !== 'to_delete' && phasenConf[a.phase]?.disabled !== true
      );
      paketIsComplete = active.length > 0 && active.every((a) => {
        if (a.id === target.id) {
          return target.is_complete === true && updatePayload.content_status === 'approved';
        }
        return a.is_complete === true && a.content_status === 'approved';
      });
      if (lernpaket.is_complete !== paketIsComplete) {
        await base44.asServiceRole.entities.Lernpakete.update(lernpaket.id, {
          is_complete: paketIsComplete,
        });
      }
    }

    // ---- Audit-Log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: entityMap[targetType],
        resource_id: target.id,
        changes: {
          release_action: release ? 'release' : 'unrelease',
          targetType,
          einheitId: einheit.id,
          rolle: auth.rolle,
        },
        affected_count: 1,
        status: 'success',
      });
    } catch (auditErr) {
      console.error('[setReleaseStatusSecure] Audit log failed:', auditErr);
    }

    return Response.json({
      success: true,
      targetType,
      targetId: target.id,
      content_status: updatePayload.content_status,
      released_at: updatePayload.released_at,
      released_by: updatePayload.released_by,
      paketIsComplete,
    });
  } catch (error) {
    console.error('[setReleaseStatusSecure] Unexpected error:', error);
    return Response.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
});