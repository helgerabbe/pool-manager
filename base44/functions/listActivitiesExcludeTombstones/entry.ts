/**
 * listActivitiesExcludeTombstones.js
 *
 * Liefert Aktivitäten excl. Tombstones mit DB-Level Filtering und
 * clientgesteuerter Pagination. `lernpaket_id` ist Pflicht, damit der
 * Endpoint keine unbounded Full-Table-Queries ausführt.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lernpaketId = String(body.lernpaket_id || '').trim();
    const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(body.offset) || 0, 0);

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaket_id ist erforderlich.' }, { status: 400 });
    }

    const filterQuery = {
      lernpaket_id: lernpaketId,
      sync_status: { $ne: 'to_delete' },
    };

    const activities = await base44.entities.LernpaketPhaseAktivitaet.filter(
      filterQuery,
      'reihenfolge',
      limit,
      offset
    );

    return Response.json({
      success: true,
      activities,
      count: activities.length,
      limit,
      offset,
      has_more: activities.length === limit,
    });
  } catch (error) {
    console.error('[listActivitiesExcludeTombstones] Error:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});