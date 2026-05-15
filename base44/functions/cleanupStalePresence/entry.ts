/**
 * cleanupStalePresence.js
 *
 * Löscht veraltete Presence-Einträge (älter als 5 Minuten).
 * Der Endpoint ist ausschließlich für Scheduled Automation gedacht und
 * erfordert den Header: Authorization: Bearer <CLEANUP_STALE_PRESENCE_SECRET>
 *
 * @MIGRATION_NOTE Supabase:
 * Dieses Skript sowie die persistente Datenbanktabelle ActiveUsersPresence
 * können in Supabase komplett entfallen. Supabase bietet Realtime Presence
 * über WebSockets: Wenn ein Client die App schließt oder die Verbindung
 * verliert, entfernt der Supabase-Server den Nutzer nach kurzem Timeout
 * automatisch aus dem synchronisierten State. CRON-Jobs für Online-Status-
 * Bereinigung sind dort nicht mehr erforderlich.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;
const PAGE_SIZE = 500;
const DELETE_BATCH_SIZE = 25;

function assertCronSecret(req) {
  const expected = Deno.env.get('CLEANUP_STALE_PRESENCE_SECRET');
  const header = req.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return !!expected && token === expected;
}

async function listAllPresence(base44) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await base44.asServiceRole.entities.ActiveUsersPresence.list('created_date', PAGE_SIZE, skip);
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

Deno.serve(async (req) => {
  try {
    if (!assertCronSecret(req)) {
      return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const allRecords = await listAllPresence(base44);
    const now = Date.now();
    const staleRecords = allRecords.filter((record) => {
      const lastSeenTime = new Date(record.last_seen_at).getTime();
      return Number.isFinite(lastSeenTime) && now - lastSeenTime > STALE_THRESHOLD_MS;
    });

    let deleted = 0;
    const errors = [];

    for (const batch of chunkArray(staleRecords, DELETE_BATCH_SIZE)) {
      const outcomes = await Promise.allSettled(
        batch.map((record) => base44.asServiceRole.entities.ActiveUsersPresence.delete(record.id))
      );

      outcomes.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          deleted += 1;
        } else {
          errors.push({
            id: batch[index].id,
            error: outcome.reason?.message || String(outcome.reason),
          });
        }
      });
    }

    return Response.json({
      success: errors.length === 0,
      scanned: allRecords.length,
      stale_found: staleRecords.length,
      deleted,
      errors,
      message: `${deleted} stale presence records deleted (older than 5 minutes)`,
    });
  } catch (error) {
    console.error('[cleanupStalePresence] Cleanup error:', error);
    return Response.json(
      { error: error?.message || String(error), success: false },
      { status: 500 }
    );
  }
});