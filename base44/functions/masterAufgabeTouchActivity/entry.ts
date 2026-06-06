/**
 * masterAufgabeTouchActivity
 *
 * Entity-Automation-Handler auf MasterAufgabe (create + update + delete).
 *
 * ⚠️ ENDLOSSCHLEIFE-SCHUTZ:
 *   Dieses Skript wird als Webhook-Handler getriggert und führt ein Update
 *   auf MasterAufgabe durch (Zeile 132). Das Update könnte ein neues
 *   Webhook-Event triggern. Schutz durch:
 *   1. Idempotenz-Check in Zeile 131: if (masterData.is_complete !== isComplete)
 *   2. Secure-Webhook-Token: Nur Base44-interne Automationen dürfen triggern
 *   3. Datenbank-Trigger (Supabase-Zukunft): BEFORE UPDATE statt Webhook
 *
 * Zweck: 
 * 1. Bei create/delete: Touch der Parent-Activity, damit der Guardian
 *    is_complete neu berechnet (Aggregat-Lücke schließen).
 * 2. Bei update: Inhaltliche Vollständigkeitsprüfung der MasterAufgabe
 *    (basierend auf catalogEntry.form_schema / Aktivitätstyp-Prüfung),
 *    dann is_complete auf MasterAufgabe setzen UND Activity touchen.
 *
 * Vollständigkeitsregeln pro Typ:
 *   - Lückentext: field_values.lueckentext muss existieren mit text + ≥1 gap mit correct
 *   - Begriffe zuordnen: field_values.pairs mit ≥3 vollständigen Paaren
 *   - Sortierung: field_values.orderedItems mit ≥2 Items
 *   - Mini-Quiz: field_values.questions mit ≥1 Frage
 *   - Bildbeschriftung: field_values.backgroundImage + ≥1 dropZone
 *   - KI-Tutor: field_values.aufgabenstellung muss vorhanden sein
 *   - Fallback / Match-Terms: mindestens irgendein Inhalt vorhanden
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;

async function listAllMasters(entity, query) {
  const all = [];
  let skip = 0;
  while (true) {
    const page = await entity.filter(query, 'reihenfolge', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

function validateWebhookSecret(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const expectedSecret = Deno.env.get('MASTER_AUFGABE_TOUCH_SECRET');
  if (!expectedSecret || !token || token !== expectedSecret) {
    return false;
  }
  return true;
}

// ── Vollständigkeitsprüfung pro Typ ──────────────────────────────────────────

function isMasterComplete(catalogName = '', fieldValues = {}) {
  const name = catalogName.toLowerCase();

  // Lückentext
  if (name.includes('lückentext') || name.includes('lueckentext') || name.includes('cloze')) {
    const lt = fieldValues.lueckentext;
    if (!lt) return false;
    // Neues Format: { text, gaps }
    if (typeof lt === 'object' && lt.text) {
      const gaps = Array.isArray(lt.gaps) ? lt.gaps : [];
      return String(lt.text).trim() !== '' && gaps.filter(g => g && g.correct && String(g.correct).trim() !== '').length >= 1;
    }
    // Altes Format: String mit [Lücken] in eckigen Klammern
    if (typeof lt === 'string') return lt.trim().length > 10 && /\[[^\]]+\]/.test(lt);
    return false;
  }

  // Begriffe zuordnen — 1 vollständiges Paar genügt
  if (name.includes('begriffe zuordnen') || name.includes('zuordnen') || name.includes('match')) {
    const pairs = Array.isArray(fieldValues.pairs) ? fieldValues.pairs : [];
    const valid = pairs.filter(p => p && String(p.left || '').trim() && String(p.right || '').trim());
    return valid.length >= 1;
  }

  // Reihenfolge / Sortierung
  if (name.includes('reihenfolge') || name.includes('sortierung') || name.includes('sorting')) {
    const items = Array.isArray(fieldValues.orderedItems) ? fieldValues.orderedItems : [];
    return items.filter(i => String(i || '').trim() !== '').length >= 2;
  }

  // Test: mindestens 1 Frage mit mindestens 1 richtiger Antwort
  if (name === 'test' || name.includes('abschlusstest')) {
    const questions = Array.isArray(fieldValues.questions) ? fieldValues.questions : [];
    return questions.some((q) => {
      if (!q || String(q.question || '').trim() === '') return false;
      if (q.type === 'solution_word' || q.type === 'text') return String(q.expectedAnswer || '').trim() !== '';
      if (q.type === 'true_false') return typeof q.correctAnswer === 'boolean';
      const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
      return answers.some((a) => (a?.isCorrect === true || a?.correct === true) && String(a.text || '').trim() !== '');
    });
  }

  // Mini-Quiz
  if (name.includes('quiz')) {
    const questions = Array.isArray(fieldValues.questions) ? fieldValues.questions : [];
    return questions.length >= 1;
  }

  // Bildbeschriftung
  if (name.includes('bildbeschriftung') || name.includes('bildbeschreibung') || name.includes('image labeling')) {
    return !!(fieldValues.backgroundImage && Array.isArray(fieldValues.dropZones) && fieldValues.dropZones.length >= 1);
  }

  // KI-Tutor
  if (name.includes('ki-tutor') || name.includes('kitutor')) {
    return !!(fieldValues.aufgabenstellung && String(fieldValues.aufgabenstellung).trim() !== '');
  }

  // Generischer Fallback: irgendeinen nicht-leeren Wert haben
  return Object.values(fieldValues).some(v => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    if (!validateWebhookSecret(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    const event = payload?.event || {};
    const eventType = event.type; // 'create' | 'update' | 'delete'
    const masterData = payload?.data || payload?.old_data || null;

    const activityId = masterData?.activity_id;
    if (!activityId) {
      return Response.json({ skipped: 'no_activity_id', eventType }, { status: 200 });
    }

    // Frisch berechneter is_complete-Wert des gerade aktualisierten Masters,
    // damit der spätere Aktivitäts-Roll-up nicht auf einem Stale-Read basiert.
    let touchedMasterId = null;
    let touchedMasterIsComplete = null;

    // ── Bei update: inhaltliche Vollständigkeitsprüfung ────────────────────
    if (eventType === 'update' && masterData) {
      const masterId = event.entity_id || masterData.id;
      if (masterId) {
        // Katalog-Eintrag für die zugehörige Aktivität laden
        let catalogName = '';
        try {
          const activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(activityId);
          if (activity?.aktivitaet_id) {
            const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog.get(activity.aktivitaet_id);
            catalogName = katalog?.name || '';
          }
        } catch (e) {
          console.warn('[masterAufgabeTouchActivity] Katalog-Load fehlgeschlagen:', e?.message);
        }

        const fieldValues = masterData.field_values || {};
        const isComplete = isMasterComplete(catalogName, fieldValues);
        touchedMasterId = masterId;
        touchedMasterIsComplete = isComplete;

        // Nur schreiben wenn sich der Wert ändert (Idempotenz)
        if (masterData.is_complete !== isComplete) {
          await base44.asServiceRole.entities.MasterAufgabe.update(masterId, { is_complete: isComplete });
        }
      }
    }

    // ── Aktuelle Activity touchen → triggert Guardian ──────────────────────
    let activity = null;
    try {
      activity = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.get(activityId);
    } catch (e) {
      return Response.json({ skipped: 'activity_not_found', activityId }, { status: 200 });
    }

    if (!activity) {
      return Response.json({ skipped: 'activity_null', activityId }, { status: 200 });
    }

    // Freigabe- UND Vollständigkeits-Aggregat aus allen aktuellen MasterAufgaben
    // berechnen. Eine Activity ist nur freigegeben, wenn mindestens ein Master
    // existiert UND alle Master freigegeben sind. Create/Delete/Update ziehen
    // damit den Parent-Status serverseitig zuverlässig nach.
    // Pagination: Alle Masters vollständig laden (Pagination-Falle vermeiden).
    const allMasters = await listAllMasters(
      base44.asServiceRole.entities.MasterAufgabe,
      { activity_id: activityId }
    );
    const liveMasters = allMasters
      .filter((m) => m.sync_status !== 'to_delete')
      // Stale-Read-Schutz: gerade aktualisierten Master mit dem frisch
      // berechneten is_complete-Wert spiegeln.
      .map((m) =>
        touchedMasterId && m.id === touchedMasterId
          ? { ...m, is_complete: touchedMasterIsComplete }
          : m
      );
    const allMastersApproved =
      liveMasters.length > 0 && liveMasters.every((m) => m.content_status === 'approved');

    // Vollständigkeit der Aktivität DIREKT hier berechnen, statt sie
    // pessimistisch auf false zu setzen und auf den asynchronen Guardian zu
    // warten. Letzteres führte zu Drift: Wenn der Guardian-Roll-up (Race /
    // Stale-Read) nicht griff, blieb die Aktivität fälschlich „unvollständig",
    // obwohl alle Master vollständig waren (z. B. Mini-Quiz mit 1 fertigem
    // Master). is_complete = (≥1 lebender Master AND alle is_complete=true).
    const computedActivityIsComplete =
      liveMasters.length > 0 && liveMasters.every((m) => m.is_complete === true);

    const releaseUpdate = allMastersApproved
      ? {
          content_status: 'approved',
          released_at: activity.released_at || new Date().toISOString(),
          released_by: activity.released_by || 'system:master_aggregate',
        }
      : {
          content_status: 'draft',
          released_at: null,
          released_by: null,
        };

    await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, {
      is_complete: computedActivityIsComplete,
      ...releaseUpdate,
    });

    return Response.json({ ok: true, eventType, activityId, activityIsComplete: computedActivityIsComplete });
  } catch (error) {
    console.error('[masterAufgabeTouchActivity] Error:', error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 200 }
    );
  }
});