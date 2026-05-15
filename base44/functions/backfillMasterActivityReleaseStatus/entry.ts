/**
 * backfillMasterActivityReleaseStatus.js
 *
 * Repariert bestehende Inkonsistenzen zwischen MasterAufgabe.content_status
 * und LernpaketPhaseAktivitaet.content_status.
 *
 * Regel: Eine masterfähige Activity ist genau dann freigegeben, wenn
 * mindestens eine MasterAufgabe existiert UND alle zugehörigen Master
 * content_status='approved' haben.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const masters = await base44.asServiceRole.entities.MasterAufgabe.list();
    const mastersByActivity = masters.reduce((acc, master) => {
      if (!master.activity_id) return acc;
      if (!acc[master.activity_id]) acc[master.activity_id] = [];
      acc[master.activity_id].push(master);
      return acc;
    }, {});

    const activityIds = Object.keys(mastersByActivity);
    const results = [];

    for (const activityId of activityIds) {
      const activities = await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ id: activityId });
      const activity = activities?.[0];
      if (!activity) {
        results.push({ activityId, status: 'skipped_missing_activity' });
        continue;
      }

      const activityMasters = mastersByActivity[activityId];
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
        await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.update(activityId, updatePayload);
      }

      results.push({
        activityId,
        masterCount: activityMasters.length,
        allApproved,
        previousStatus: activity.content_status || 'draft',
        nextStatus: updatePayload.content_status,
        updated: needsUpdate,
      });
    }

    return Response.json({
      success: true,
      checkedActivities: results.length,
      updatedActivities: results.filter((r) => r.updated).length,
      results,
    });
  } catch (error) {
    console.error('[backfillMasterActivityReleaseStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});