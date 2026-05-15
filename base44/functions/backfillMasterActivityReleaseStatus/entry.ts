/**
 * backfillMasterActivityReleaseStatus.js
 *
 * Repariert bestehende Inkonsistenzen zwischen MasterAufgabe.content_status
 * und LernpaketPhaseAktivitaet.content_status.
 *
 * Regel: Eine masterfähige Activity ist genau dann freigegeben, wenn
 * mindestens eine MasterAufgabe existiert UND alle zugehörigen Master
 * content_status='approved' haben. Masterfähige Activities ohne Master
 * werden explizit auf draft zurückgesetzt.
 *
 * @MIGRATION_NOTE Supabase:
 * Dieses Backfill-Skript wird in PostgreSQL durch ein set-basiertes SQL-Update
 * bzw. langfristig durch einen Trigger/View ersetzt. Beispiel-Grundidee:
 * UPDATE lernpaket_phase_aktivitaet lpa
 * SET content_status = CASE
 *   WHEN m.approved_count = m.total_count AND m.total_count > 0 THEN 'approved'
 *   ELSE 'draft'
 * END
 * FROM (
 *   SELECT activity_id,
 *          COUNT(*) AS total_count,
 *          SUM(CASE WHEN content_status = 'approved' THEN 1 ELSE 0 END) AS approved_count
 *   FROM master_aufgabe
 *   GROUP BY activity_id
 * ) m
 * WHERE lpa.id = m.activity_id;
 * Für Activities ohne Master braucht Supabase zusätzlich ein LEFT JOIN / NOT EXISTS,
 * damit fälschlich freigegebene masterfähige Activities auf draft zurückfallen.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BACKFILL_LIMIT = 10000;
const UPDATE_BATCH_SIZE = 10;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [masters, activities, katalogEntries] = await Promise.all([
      base44.asServiceRole.entities.MasterAufgabe.list(undefined, MAX_BACKFILL_LIMIT),
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.list(undefined, MAX_BACKFILL_LIMIT),
      base44.asServiceRole.entities.AktivitaetenKatalog.list(undefined, MAX_BACKFILL_LIMIT),
    ]);

    const katalogById = new Map(katalogEntries.map((entry) => [entry.id, entry]));
    const mastersByActivity = masters.reduce((acc, master) => {
      if (!master.activity_id) return acc;
      if (!acc[master.activity_id]) acc[master.activity_id] = [];
      acc[master.activity_id].push(master);
      return acc;
    }, {});

    const results = [];
    const updates = [];

    for (const activity of activities) {
      const katalogEntry = katalogById.get(activity.aktivitaet_id);
      const isMasterCapable = activity.is_master || katalogEntry?.supports_master === true;

      if (!isMasterCapable) {
        continue;
      }

      const activityMasters = mastersByActivity[activity.id] || [];
      const allApproved =
        activityMasters.length > 0 && activityMasters.every((m) => m.content_status === 'approved');

      const updatePayload = allApproved
        ? {
            content_status: 'approved',
            released_at: activity.released_at || new Date().toISOString(),
            released_by: activity.released_by || 'system:backfill_master_activity_release',
          }
        : {
            content_status: 'draft',
            released_at: null,
            released_by: null,
          };

      const needsUpdate =
        activity.content_status !== updatePayload.content_status ||
        (updatePayload.content_status === 'draft' && (activity.released_at || activity.released_by)) ||
        (updatePayload.content_status === 'approved' && (!activity.released_at || !activity.released_by));

      if (needsUpdate) {
        updates.push({ activityId: activity.id, updatePayload });
      }

      results.push({
        activityId: activity.id,
        masterCount: activityMasters.length,
        allApproved,
        previousStatus: activity.content_status || 'draft',
        nextStatus: updatePayload.content_status,
        updated: needsUpdate,
      });
    }

    for (const batch of chunkArray(updates, UPDATE_BATCH_SIZE)) {
      await Promise.all(
        batch.map(({ activityId, updatePayload }) =>
          base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, updatePayload)
        )
      );
    }

    return Response.json({
      success: true,
      checkedActivities: results.length,
      updatedActivities: updates.length,
      loadedRecords: {
        masters: masters.length,
        activities: activities.length,
        katalogEntries: katalogEntries.length,
      },
      results,
    });
  } catch (error) {
    console.error('[backfillMasterActivityReleaseStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});