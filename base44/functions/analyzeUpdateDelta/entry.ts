/**
 * analyzeUpdateDelta
 *
 * Analysiert das Delta einer bereits veröffentlichten Einheit (published)
 * und empfiehlt eine Update-Strategie ("no_reset" oder "full_reset").
 *
 * Payload: { einheitId: string }
 *
 * Antwort: {
 *   textOnly: boolean,          // true wenn nur Textfelder geändert wurden
 *   hasNewItems: boolean,       // neue Aufgaben/Lernpakete/Aktivitäten
 *   hasDeletedItems: boolean,   // gelöschte Items (sync_status='to_delete')
 *   hasDashboardChanges: boolean, // Dashboard-Struktur geändert
 *   deletedCount: number,
 *   newCount: number,
 *   modifiedCount: number,
 *   dashboardChangedLerntypen: string[],
 *   empfehlung: 'no_reset' | 'full_reset',
 *   empfehlungBegruendung: string,
 *   analysis: object  // detailliertes Analyse-Objekt
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE_SIZE = 500;
const FILTER_CHUNK_SIZE = 50;

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
 * Vergleich der Dashboard-Struktur (lernpfade_konfiguration).
 * Prüft, ob sich Sektoren oder Items geändert haben (Reihenfolge,
 * neue/gelöschte Sektoren/Items, Umbenennungen).
 */
function analyzeDashboardChanges(einheit, themenfelder, lernpakete) {
  const lernpfade = einheit.lernpfade_konfiguration || {};
  const lerntypen = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
  const changedLerntypen = [];
  let hasStructuralChanges = false;

  for (const lt of lerntypen) {
    const sektoren = lernpfade[lt] || [];
    if (sektoren.length === 0) continue;

    // Auf strukturelle Hinweise prüfen:
    // - Gibt es Sektoren ohne titel_snapshot? (neu hinzugefügt)
    // - Gibt es Sektoren mit modus-Änderungen?
    // - Gibt es Items ohne instance_id? (Legacy, neu)
    for (const sektor of sektoren) {
      if (!sektor.titel_snapshot) {
        hasStructuralChanges = true;
        changedLerntypen.push(lt);
        break;
      }
      const items = sektor.items || [];
      for (const item of items) {
        if (!item.instance_id) {
          hasStructuralChanges = true;
          if (!changedLerntypen.includes(lt)) changedLerntypen.push(lt);
          break;
        }
      }
    }
  }

  return { hasStructuralChanges, changedLerntypen: [...new Set(changedLerntypen)] };
}

/**
 * Prüft, ob Änderungen an Aufgaben/Lernpaketen/Aktivitäten NUR textueller
 * Natur sind (keine neuen Items, keine gelöschten).
 * "Textuell" = sync_status='modified' ohne strukturelle Feldänderungen.
 * Da wir den Vorher-Wert nicht kennen, schätzen wir konservativ:
 * - modified + titel unverändert → wahrscheinlich textuell
 * - modified + titel geändert → struktureller
 *
 * Vereinfachte Heuristik: sind ALLE modified-Items noch vorhanden (nicht
 * gelöscht) und gibt es KEINE neuen (new) oder to_delete, dann ist es
 * wahrscheinlich nur textuell.
 */
function classifyDelta(delta) {
  const hasStructural = delta.hasNewItems || delta.hasDeletedItems || delta.hasDashboardChanges;
  const textOnly = !hasStructural && delta.modifiedCount > 0;

  let empfehlung = 'no_reset';
  let begruendung = '';

  if (textOnly) {
    empfehlung = 'no_reset';
    begruendung = 'Es wurden nur bestehende Inhalte bearbeitet (z. B. Textkorrekturen). Ein Reset ist nicht nötig.';
  } else if (delta.hasDeletedItems && delta.deletedCount >= 3) {
    empfehlung = 'full_reset';
    begruendung = `Es wurden ${delta.deletedCount} Elemente gelöscht. Um Inkonsistenzen im Schülerfortschritt zu vermeiden, wird ein Reset empfohlen.`;
  } else if (delta.hasDashboardChanges && delta.hasDeletedItems) {
    empfehlung = 'full_reset';
    begruendung = 'Dashboard-Struktur wurde geändert UND Elemente wurden gelöscht. Ein Reset stellt sicher, dass alle Schüler mit der neuen Struktur arbeiten.';
  } else if (delta.hasNewItems && !delta.hasDeletedItems && !delta.hasDashboardChanges) {
    empfehlung = 'no_reset';
    begruendung = 'Es wurden nur neue Inhalte hinzugefügt. Bestehende Fortschritte bleiben erhalten, neue Inhalte erscheinen als "Neu".';
  } else if (delta.hasDashboardChanges && !delta.hasDeletedItems) {
    empfehlung = 'no_reset';
    begruendung = 'Die Dashboard-Reihenfolge wurde geändert – der Pfad aktualisiert sich automatisch. Fortschritte bleiben erhalten.';
  } else {
    // Gemischter Fall: konservativ no_reset vorschlagen, aber Lehrkraft
    // kann selbst entscheiden.
    empfehlung = 'no_reset';
    begruendung = 'Gemischte Änderungen erkannt. Update ohne Reset ist möglich, aber prüfe sorgfältig, ob gelöschte Elemente bereits von Schülern bearbeitet wurden.';
  }

  return { empfehlung, begruendung };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { einheitId } = await req.json().catch(() => ({}));
    if (!einheitId) return Response.json({ error: 'einheitId required' }, { status: 400 });

    const einheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    // Nur relevant, wenn die Einheit bereits veröffentlicht war.
    const isUpdate = einheit.export_lifecycle_status === 'published' || einheit.export_lifecycle_status === 'draft';
    // Auch im Draft kann es ein Update sein, wenn vorher published.

    // ── Alle Inhalte der Einheit laden ──────────────────────────────
    const themenfelder = await listAllByFilter(
      base44.asServiceRole.entities.Themenfeld, { einheit_id: einheitId }
    );
    const themenfeldIds = (themenfelder || []).map((t) => t.id);

    const [lpByEinheit, lpByThemenfeld] = await Promise.all([
      listAllByFilter(base44.asServiceRole.entities.Lernpakete, { einheit_id: einheitId }),
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

    const aufgaben = await listAllByFilter(
      base44.asServiceRole.entities.AllgemeineAufgabe, { einheit_id: einheitId }
    );

    const [aktivitaeten, masters] = await Promise.all([
      lernpaketIds.size > 0
        ? filterInChunks(base44.asServiceRole.entities.LernpaketPhaseAktivitaet, 'lernpaket_id', Array.from(lernpaketIds))
        : Promise.resolve([]),
      lernpaketIds.size > 0
        ? filterInChunks(base44.asServiceRole.entities.MasterAufgabe, 'lernpaket_id', Array.from(lernpaketIds))
        : Promise.resolve([]),
    ]);

    // ── Delta zählen ────────────────────────────────────────────────
    let newCount = 0, modifiedCount = 0, deletedCount = 0;

    const allItems = [...lernpakete, ...aufgaben, ...aktivitaeten, ...masters];
    for (const item of allItems) {
      const s = item.sync_status || 'new';
      if (s === 'new') newCount++;
      else if (s === 'modified') modifiedCount++;
      else if (s === 'to_delete') deletedCount++;
    }

    // ── Dashboard-Analyse ───────────────────────────────────────────
    const dashboard = analyzeDashboardChanges(einheit, themenfelder, lernpakete);

    const delta = {
      textOnly: false,
      hasNewItems: newCount > 0,
      hasDeletedItems: deletedCount > 0,
      hasDashboardChanges: dashboard.hasStructuralChanges,
      deletedCount,
      newCount,
      modifiedCount,
      dashboardChangedLerntypen: dashboard.changedLerntypen,
    };

    // Text-Only-Erkennung
    delta.textOnly = !delta.hasNewItems && !delta.hasDeletedItems && !delta.hasDashboardChanges && modifiedCount > 0;

    const { empfehlung, begruendung } = classifyDelta(delta);

    // ── Analyse auf der Einheit speichern ───────────────────────────
    try {
      await base44.entities.Einheiten.update(einheitId, {
        update_strategy_analysis: {
          ...delta,
          analysedAt: new Date().toISOString(),
          analysedBy: user.email,
        },
        update_strategy_empfehlung: empfehlung,
      });
    } catch (_e) {
      // Nicht kritisch – Analyse wird auch ohne Speicherung zurückgegeben.
    }

    return Response.json({
      ...delta,
      empfehlung,
      empfehlungBegruendung: begruendung,
      isUpdate,
      analysis: delta,
    });
  } catch (error) {
    console.error('[analyzeUpdateDelta] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});