/**
 * fixRubricCriteria.js
 *
 * Behebt kaputte rubric_criteria-Felder (Objekte statt Arrays), ohne
 * vorhandene Bewertungstexte zu löschen. Nutzdaten werden in die neue
 * Array-Struktur { title, points, criteria_text } überführt.
 *
 * Supabase-Migrationsnotiz:
 * Reine Hard-Reset-Fälle könnten später direkt per SQL gelöst werden:
 * UPDATE allgemeine_aufgabe
 * SET rubric_criteria = '[]'::jsonb
 * WHERE jsonb_typeof(rubric_criteria) = 'object';
 * Für datenbewahrende Konvertierung ist eine JSONB-Transformations-RPC sinnvoll.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 30;

const KNOWN_LEVELS = {
  sufficient: { title: 'Ausreichend', points: 1 },
  good: { title: 'Gut', points: 2 },
  excellent: { title: 'Exzellent', points: 3 },
};

async function listAll(entity) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.list('created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function runInBatches(tasks, batchSize = UPDATE_BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map((task) => task());
    results.push(...await Promise.allSettled(batch));
  }
  return results;
}

function stringifyCriteriaValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return '';
}

function convertRubricObject(rubricObject) {
  return Object.entries(rubricObject)
    .map(([key, value], index) => {
      const criteriaText = stringifyCriteriaValue(value);
      if (!criteriaText) return null;

      const knownLevel = KNOWN_LEVELS[key] || null;
      return {
        title: knownLevel?.title || key,
        points: knownLevel?.points || index + 1,
        criteria_text: criteriaText,
      };
    })
    .filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'Administrator')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const entity = base44.asServiceRole.entities.AllgemeineAufgabe;
    const aufgaben = await listAll(entity);
    const updateTasks = [];
    let convertedWithContent = 0;
    let resetEmptyObjects = 0;

    for (const aufgabe of aufgaben) {
      const rubric = aufgabe.rubric_criteria;
      if (rubric && typeof rubric === 'object' && !Array.isArray(rubric)) {
        const converted = convertRubricObject(rubric);
        if (converted.length > 0) {
          convertedWithContent += 1;
        } else {
          resetEmptyObjects += 1;
        }
        updateTasks.push(() => entity.update(aufgabe.id, { rubric_criteria: converted }));
      }
    }

    const results = await runInBatches(updateTasks);
    const errors = results
      .map((result, index) => result.status === 'rejected'
        ? { index, error: result.reason?.message || String(result.reason) }
        : null)
      .filter(Boolean);

    return Response.json({
      status: errors.length === 0 ? 'success' : 'partial_success',
      message: `${results.length - errors.length} Aufgaben repariert`,
      fixed: results.length - errors.length,
      convertedWithContent,
      resetEmptyObjects,
      errors,
      totalChecked: aufgaben.length,
    });
  } catch (error) {
    console.error('[fixRubricCriteria] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});