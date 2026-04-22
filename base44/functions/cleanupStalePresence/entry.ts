/**
 * cleanupStalePresence
 * Löscht veraltete Presence-Einträge (älter als 5 Minuten)
 * Kann via Automation oder manuell aufgerufen werden
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 Minuten

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allRecords = await base44.entities.ActiveUsersPresence.list();
    const now = Date.now();
    const staleRecords = [];

    for (const record of allRecords) {
      const lastSeenTime = new Date(record.last_seen_at).getTime();
      const age = now - lastSeenTime;

      if (age > STALE_THRESHOLD_MS) {
        staleRecords.push(record);
      }
    }

    // Lösche alle veralteten Einträge
    let deleted = 0;
    for (const record of staleRecords) {
      await base44.entities.ActiveUsersPresence.delete(record.id);
      deleted++;
    }

    return Response.json({
      success: true,
      deleted,
      message: `${deleted} stale presence records deleted (older than 5 minutes)`,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});