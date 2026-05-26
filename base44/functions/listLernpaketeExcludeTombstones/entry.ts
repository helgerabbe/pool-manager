/**
 * listLernpaketeExcludeTombstones.js
 *
 * Liefert sichtbare Lernpakete für einen konkreten Scope und filtert
 * Tombstones (sync_status='to_delete') direkt auf Datenbankebene aus.
 * Wird von der UI (Ebene 1-4) verwendet.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const einheitId = String(url.searchParams.get('einheit_id') || '').trim();
    const themenfeldId = String(url.searchParams.get('themenfeld_id') || '').trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

    if (!einheitId && !themenfeldId) {
      return Response.json({ error: 'einheit_id oder themenfeld_id ist erforderlich.' }, { status: 400 });
    }

    const filterQuery = {
      sync_status: { $ne: 'to_delete' },
    };

    if (themenfeldId) {
      filterQuery.themenfeld_id = themenfeldId;
    } else {
      filterQuery.einheit_id = einheitId;
    }

    const lernpakete = await base44.entities.Lernpakete.filter(
      filterQuery,
      'reihenfolge_nummer',
      limit,
      offset
    );

    return Response.json({
      success: true,
      lernpakete,
      count: lernpakete.length,
      limit,
      offset,
      has_more: lernpakete.length === limit,
    });
  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});