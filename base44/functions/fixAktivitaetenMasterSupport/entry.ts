import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 30;

/**
 * Supabase-Migrationsnotiz:
 * Dieses One-Off-Skript wird später durch einen direkten SQL-Update ersetzt:
 * UPDATE aktivitaeten_katalog
 * SET supports_master = (phase IN ('Übung', 'Abschluss'));
 */
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Nur Admins dürfen das' }, { status: 403 });
    }

    const entity = base44.asServiceRole.entities.AktivitaetenKatalog;
    const aktivitaeten = await listAll(entity);
    const updateTasks = [];

    for (const aktivitaet of aktivitaeten) {
      const supportsMaster = aktivitaet.phase === 'Übung' || aktivitaet.phase === 'Abschluss';
      if (aktivitaet.supports_master !== supportsMaster) {
        updateTasks.push(() => entity.update(aktivitaet.id, { supports_master: supportsMaster }));
      }
    }

    const results = await runInBatches(updateTasks);
    const failed = results.filter((result) => result.status === 'rejected');

    if (failed.length > 0) {
      console.error('[fixAktivitaetenMasterSupport] Update failures:', failed.map((f) => f.reason?.message || String(f.reason)).slice(0, 10));
    }

    return Response.json({
      success: failed.length === 0,
      message: `${results.length - failed.length} Aktivitäten aktualisiert: Übung + Abschluss = Master-Aufgaben erlaubt`,
      updated: results.length - failed.length,
      failed: failed.length,
      totalChecked: aktivitaeten.length,
    });
  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});