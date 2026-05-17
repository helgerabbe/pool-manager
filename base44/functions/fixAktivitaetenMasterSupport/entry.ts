import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 40;

/**
 * One-Off-Migration: supports_master aus der Phase ableiten.
 *
 * Supabase-Migrationsnotiz:
 * Dieses Skript wird nach der Migration auf PostgreSQL obsolet. Die gleiche
 * Korrektur läuft dort transaktional und ohne N+1-Requests als einzelnes SQL:
 * UPDATE aktivitaeten_katalog
 * SET supports_master = (phase IN ('Übung', 'Abschluss'));
 */
async function listAllAktivitaeten(entity) {
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

async function runInBatches(tasks, batchSize) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map((task) => task());
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
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
    const aktivitaeten = await listAllAktivitaeten(entity);
    const updateTasks = [];

    for (const aktivitaet of aktivitaeten) {
      const supportsMaster = aktivitaet.phase === 'Übung' || aktivitaet.phase === 'Abschluss';

      if (aktivitaet.supports_master !== supportsMaster) {
        updateTasks.push(() => entity.update(aktivitaet.id, { supports_master: supportsMaster }));
      }
    }

    const results = await runInBatches(updateTasks, UPDATE_BATCH_SIZE);
    const failed = results.filter((result) => result.status === 'rejected');

    if (failed.length > 0) {
      console.error(
        `[fixAktivitaetenMasterSupport] ${failed.length}/${results.length} updates failed`,
        failed.slice(0, 3).map((result) => result.reason?.message || String(result.reason))
      );
    }

    const updated = results.length - failed.length;

    return Response.json({
      success: failed.length === 0,
      message: `${updated} Aktivitäten aktualisiert: Übung + Abschluss = Master-Aufgaben erlaubt`,
      scanned: aktivitaeten.length,
      updated,
      failed: failed.length,
    });
  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});