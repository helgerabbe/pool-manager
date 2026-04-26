/**
 * sseUpdates.js
 * ──────────────
 * Server-Sent-Events Endpoint für Echtzeit-Sperr-Synchronisation.
 *
 * Authentifizierung:
 *   - Erwartet `Authorization: Bearer <token>` Header.
 *   - Validierung via createClientFromRequest(req).auth.me().
 *   - 401 bei fehlender/ungültiger Authentifizierung.
 *
 * Stream:
 *   - Content-Type: text/event-stream
 *   - Heartbeat alle 15s (Kommentar `:heartbeat\n\n`, verhindert NAT-Timeouts).
 *   - Bei Disconnect (req.signal onabort) werden Subscriptions & Timer sauber beendet.
 *
 * ─── ADAPTER-PATTERN-HINWEIS ──────────────────────────────────────────────
 * Backend-Functions in Deno Deploy können KEINE lokalen Module importieren
 * (jede Function wird isoliert deployt). Deshalb ist der Adapter-Code für
 * Datenbank-Subscriptions HIER INLINE unter dem Abschnitt `// ── ADAPTER ──`
 * eingebunden. Bei einem Provider-Wechsel (z.B. Supabase Realtime) muss NUR
 * dieser Abschnitt angepasst werden – die Stream-Logik bleibt unverändert.
 * Die spiegelgleiche Referenz-Datei services/databaseSubscription.js
 * dokumentiert die Abstraktion für Code-Reviews & Architektur.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WATCHED_ENTITIES = ['Einheiten', 'Lernpakete'];
const HEARTBEAT_INTERVAL_MS = 15_000;

// ═════════════════════════════════════════════════════════════════════════
// ── ADAPTER: databaseSubscription (provider-spezifisch: Base44) ──────────
// ═════════════════════════════════════════════════════════════════════════

// Whitelist: Nur diese Felder dürfen den Adapter Richtung Client passieren.
// KEINE Inhalts- oder Textfelder! (Field-Level Security / Data Exposure Prevention)
const ALLOWED_FIELDS = [
  'is_locked',
  'locked_by_email',
  'structural_lock',
  'structural_locked_at',
  'version',
];

function computeFilteredDiff(newData, oldData) {
  const changes = {};
  if (!newData) return changes;
  for (const field of ALLOWED_FIELDS) {
    const newVal = newData[field];
    const oldVal = oldData ? oldData[field] : undefined;
    if (newVal !== oldVal) changes[field] = newVal;
  }
  return changes;
}

function filterSnapshot(data) {
  const snapshot = {};
  if (!data) return snapshot;
  for (const field of ALLOWED_FIELDS) {
    if (data[field] !== undefined) snapshot[field] = data[field];
  }
  return snapshot;
}

function transformEvent(entityName, event) {
  const operation = (event.type || '').toUpperCase();
  const recordId = event.id;
  if (!recordId || !operation) return null;

  let changes = {};
  if (operation === 'UPDATE') {
    changes = computeFilteredDiff(event.data, event.old_data);
    if (Object.keys(changes).length === 0) return null; // Nichts Relevantes geändert
  } else if (operation === 'CREATE') {
    changes = filterSnapshot(event.data);
  } // DELETE → leere changes

  return { operation, entity: entityName, recordId, changes };
}

/**
 * Generische Subscribe-Abstraktion. Bei Provider-Wechsel nur hier tauschen.
 */
function listenToChanges(serviceClient, entityName, callback) {
  const entity = serviceClient.asServiceRole.entities[entityName];
  if (!entity || typeof entity.subscribe !== 'function') {
    console.error(`[sseUpdates] Entity "${entityName}" nicht subscribe-fähig.`);
    return () => {};
  }

  console.log(`[sseUpdates] Subscribe: ${entityName}`);
  const unsubscribe = entity.subscribe((event) => {
    try {
      const payload = transformEvent(entityName, event);
      if (payload) callback(payload);
    } catch (err) {
      console.error(`[sseUpdates] Transform-Fehler (${entityName}):`, err);
    }
  });

  return () => {
    try {
      if (typeof unsubscribe === 'function') unsubscribe();
      console.log(`[sseUpdates] Unsubscribe: ${entityName}`);
    } catch (err) {
      console.warn(`[sseUpdates] Unsubscribe-Fehler (${entityName}):`, err?.message);
    }
  };
}

// ═════════════════════════════════════════════════════════════════════════
// ── HTTP HANDLER ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  let user;
  let base44;
  try {
    base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch (err) {
    console.warn('[sseUpdates] Auth-Fehler:', err?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[sseUpdates] Stream gestartet für ${user.email}`);

  // ── Service-Client für Subscriptions (Whitelist filtert Inhalte) ─────────
  // Wir verwenden den bereits authentifizierten Request-Client; sein
  // `asServiceRole` greift den platform-internen Service-Token automatisch.
  const serviceClient = base44;

  // ── Stream-Setup ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const unsubscribeFns = [];
  let heartbeatTimer = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch (err) {
          console.warn('[sseUpdates] Enqueue-Fehler:', err?.message);
        }
      };

      const sendEvent = (data, eventType = 'entityUpdate') => {
        safeEnqueue(`event: ${eventType}\n`);
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial-Handshake
      sendEvent({ type: 'connected', user: user.email }, 'ready');

      // Subscriptions
      for (const entityName of WATCHED_ENTITIES) {
        const unsub = listenToChanges(serviceClient, entityName, (payload) => {
          sendEvent(payload, 'entityUpdate');
        });
        unsubscribeFns.push(unsub);
      }

      // Heartbeat
      heartbeatTimer = setInterval(() => {
        safeEnqueue(`:heartbeat\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup bei Client-Disconnect
      const cleanup = () => {
        if (closed) return;
        closed = true;
        console.log(`[sseUpdates] Cleanup für ${user.email}`);
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        for (const unsub of unsubscribeFns) {
          try { unsub(); } catch (err) { console.warn('[sseUpdates] Unsub-Fehler:', err?.message); }
        }
        unsubscribeFns.length = 0;
        try { controller.close(); } catch { /* already closed */ }
      };

      req.signal.addEventListener('abort', cleanup);
    },

    cancel() {
      console.log(`[sseUpdates] Stream cancelled für ${user.email}`);
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      for (const unsub of unsubscribeFns) {
        try { unsub(); } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});