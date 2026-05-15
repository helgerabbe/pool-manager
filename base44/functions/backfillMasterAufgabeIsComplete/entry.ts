/**
 * backfillMasterAufgabeIsComplete
 *
 * Einmalige Migration: Berechnet is_complete für alle bestehenden
 * MasterAufgaben und setzt das neue Feld retroaktiv.
 * Danach: Activity-Caches touched → Guardian berechnet Lernpaket-Aggregat neu.
 *
 * Nur für Admins aufrufbar.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Alle MasterAufgaben laden
    const masters = await base44.asServiceRole.entities.MasterAufgabe.list();
    if (!masters || masters.length === 0) {
      return Response.json({ ok: true, processed: 0, message: 'Keine MasterAufgaben gefunden.' });
    }

    // Alle Aktivitäten laden für Katalog-Lookup
    const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list();
    const activityMap = Object.fromEntries((activities || []).map(a => [a.id, a]));

    // Katalog laden
    const katalogList = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    const katalogMap = Object.fromEntries((katalogList || []).map(k => [k.id, k]));

    let updated = 0;
    let skipped = 0;
    const touchedActivityIds = new Set();

    for (const master of masters) {
      try {
        const activity = activityMap[master.activity_id];
        const katalog = activity ? katalogMap[activity.aktivitaet_id] : null;
        const catalogName = katalog?.name || '';
        const fieldValues = master.field_values || {};

        const isComplete = isMasterComplete(catalogName, fieldValues);

        if ((master.is_complete === true) !== isComplete) {
          await base44.asServiceRole.entities.MasterAufgabe.update(master.id, { is_complete: isComplete });
          updated++;
          if (master.activity_id) touchedActivityIds.add(master.activity_id);
        } else {
          skipped++;
        }
      } catch (e) {
        console.warn('[backfill] Skipping master', master.id, e?.message);
        skipped++;
      }
    }

    // Betroffene Activities touchen → triggert Guardian
    for (const actId of touchedActivityIds) {
      try {
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(actId, { is_complete: false });
      } catch (e) {
        console.warn('[backfill] Activity touch failed:', actId, e?.message);
      }
    }

    return Response.json({
      ok: true,
      processed: masters.length,
      updated,
      skipped,
      touchedActivities: touchedActivityIds.size,
    });
  } catch (error) {
    console.error('[backfillMasterAufgabeIsComplete] Error:', error);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});