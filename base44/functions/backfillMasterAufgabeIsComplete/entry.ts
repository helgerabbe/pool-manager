/**
 * backfillMasterAufgabeIsComplete
 *
 * Einmalige Migration: Berechnet is_complete für alle bestehenden
 * MasterAufgaben und setzt das neue Feld retroaktiv.
 * Danach: Betroffene Activities werden ohne semantische Status-Verfälschung
 * getouched, damit nachgelagerte Aggregate neu berechnet werden können.
 *
 * Hinweis Wartbarkeit: Die Typ-Erkennung über Katalognamen ist nur für dieses
 * einmalige Backfill-Skript akzeptabel und darf nicht als dauerhafte Fachlogik
 * in die reguläre Codebasis übernommen werden.
 *
 * @MIGRATION_NOTE Supabase:
 * - Dieses Backfill-Skript wird in PostgreSQL durch ein einzelnes set-basiertes
 *   SQL-Query mit JSONB-Funktionen ersetzt, das field_values direkt in der DB
 *   auswertet und MasterAufgabe.is_complete in Millisekunden korrigiert.
 * - Dauerhaft sollte is_complete nicht durch Application-Code gepflegt werden,
 *   sondern über AFTER UPDATE/INSERT/DELETE Trigger auf master_aufgabe, eine
 *   GENERATED ALWAYS AS Spalte oder einen View berechnet werden.
 *
 * Nur für Admins aufrufbar.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BACKFILL_LIMIT = 10000;
const UPDATE_BATCH_SIZE = 50;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function isMasterComplete(catalogName = '', fieldValues = {}) {
  const name = catalogName.toLowerCase();

  if (name.includes('lückentext') || name.includes('lueckentext') || name.includes('cloze')) {
    const lt = fieldValues.lueckentext;
    if (!lt) return false;
    // Neues Format: { text, gaps }
    if (typeof lt === 'object' && lt.text) {
      const gaps = Array.isArray(lt.gaps) ? lt.gaps : [];
      return String(lt.text).trim() !== '' && gaps.filter(g => g && g.correct && String(g.correct).trim() !== '').length >= 1;
    }
    // Altes Format: String mit [Lücken] in eckigen Klammern
    if (typeof lt === 'string') {
      const hasText = lt.trim().length > 10;
      const hasGaps = /\[[^\]]+\]/.test(lt);
      return hasText && hasGaps;
    }
    return false;
  }
  if (name.includes('begriffe zuordnen') || name.includes('zuordnen') || name.includes('match')) {
    const pairs = Array.isArray(fieldValues.pairs) ? fieldValues.pairs : [];
    return pairs.filter(p => p && String(p.left || '').trim() && String(p.right || '').trim()).length >= 3;
  }
  if (name.includes('reihenfolge') || name.includes('sortierung') || name.includes('sorting')) {
    const items = Array.isArray(fieldValues.orderedItems) ? fieldValues.orderedItems : [];
    return items.filter(i => String(i || '').trim() !== '').length >= 2;
  }
  if (name.includes('quiz')) {
    return (Array.isArray(fieldValues.questions) ? fieldValues.questions : []).length >= 1;
  }
  if (name.includes('bildbeschriftung') || name.includes('image labeling')) {
    return !!(fieldValues.backgroundImage && Array.isArray(fieldValues.dropZones) && fieldValues.dropZones.length >= 1);
  }
  if (name.includes('ki-tutor')) {
    return !!(fieldValues.aufgabenstellung && String(fieldValues.aufgabenstellung).trim() !== '');
  }
  return Object.values(fieldValues).some(v => {
    if (!v) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [masters, activities, katalogList] = await Promise.all([
      base44.asServiceRole.entities.MasterAufgabe.list(undefined, MAX_BACKFILL_LIMIT),
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(undefined, MAX_BACKFILL_LIMIT),
      base44.asServiceRole.entities.AktivitaetenKatalog.list(undefined, MAX_BACKFILL_LIMIT),
    ]);

    if (!masters || masters.length === 0) {
      return Response.json({ ok: true, processed: 0, message: 'Keine MasterAufgaben gefunden.' });
    }

    const activityMap = Object.fromEntries((activities || []).map(a => [a.id, a]));
    const katalogMap = Object.fromEntries((katalogList || []).map(k => [k.id, k]));

    let skipped = 0;
    const masterUpdates = [];
    const touchedActivityIds = new Set();

    for (const master of masters) {
      try {
        const activity = activityMap[master.activity_id];
        const katalog = activity ? katalogMap[activity.aktivitaet_id] : null;
        const catalogName = katalog?.name || '';
        const fieldValues = master.field_values || {};
        const isComplete = isMasterComplete(catalogName, fieldValues);

        if ((master.is_complete === true) !== isComplete) {
          masterUpdates.push({ masterId: master.id, activityId: master.activity_id, isComplete });
          if (master.activity_id) touchedActivityIds.add(master.activity_id);
        } else {
          skipped++;
        }
      } catch (e) {
        console.warn('[backfill] Skipping master', master.id, e?.message);
        skipped++;
      }
    }

    for (const batch of chunkArray(masterUpdates, UPDATE_BATCH_SIZE)) {
      await Promise.all(
        batch.map(({ masterId, isComplete }) =>
          base44.asServiceRole.entities.MasterAufgabe.update(masterId, { is_complete: isComplete })
        )
      );
    }

    const activityTouches = Array.from(touchedActivityIds)
      .map((activityId) => activityMap[activityId])
      .filter(Boolean)
      .map((activity) => ({
        activityId: activity.id,
        touchPayload: { sync_status: activity.sync_status || 'new' },
      }));

    for (const batch of chunkArray(activityTouches, UPDATE_BATCH_SIZE)) {
      await Promise.all(
        batch.map(({ activityId, touchPayload }) =>
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, touchPayload)
        )
      );
    }

    return Response.json({
      ok: true,
      processed: masters.length,
      updated: masterUpdates.length,
      skipped,
      touchedActivities: activityTouches.length,
      loadedRecords: {
        masters: masters.length,
        activities: activities.length,
        katalogEntries: katalogList.length,
      },
    });
  } catch (error) {
    console.error('[backfillMasterAufgabeIsComplete] Error:', error);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});