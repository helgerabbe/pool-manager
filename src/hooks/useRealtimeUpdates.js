/**
 * useRealtimeUpdates.js
 * ──────────────────────
 * Globaler Hook für die SSE-Verbindung zum Backend-Endpoint /functions/sseUpdates.
 *
 * WICHTIG:
 * - Native EventSource-API unterstützt KEINE Custom-Header → wir nutzen
 *   @microsoft/fetch-event-source, um Bearer-Tokens korrekt zu übergeben.
 * - Das Auth-Token wird bei JEDEM (Re-)Connect frisch abgerufen – kein
 *   Closure-Cache, damit abgelaufene Tokens automatisch erneuert werden.
 *
 * Ausgabe (Phase 1): Eingehende normierte Payloads werden per console.log
 * ausgegeben bzw. an onUpdate(callback) weitergereicht. Cache-Patching
 * folgt in Phase 2.
 */

import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { base44 } from '@/api/base44Client';

// Base44 Functions-Endpoint (Plattform-Konvention: /functions/<name>)
const SSE_URL = '/functions/sseUpdates';

class FatalSSEError extends Error {}

export function useRealtimeUpdates(onUpdate) {
  // Ref, damit Callback-Änderungen den Effect nicht neu starten
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    const abortController = new AbortController();
    let retryDelayMs = 1000;

    const connect = async () => {
      try {
        await fetchEventSource(SSE_URL, {
          signal: abortController.signal,
          openWhenHidden: true,

          // Frischer Token bei JEDEM (Re-)Connect – kein Closure-Caching
          fetch: async (url, init) => {
            let token = null;
            try {
              // Base44 SDK: Token aus aktueller Session ziehen
              token = await base44.auth.getToken?.();
              if (!token) {
                // Fallback: Wenn kein getToken existiert, me() triggert Refresh
                await base44.auth.me();
                token = await base44.auth.getToken?.();
              }
            } catch (err) {
              console.warn('[useRealtimeUpdates] Token-Abruf fehlgeschlagen:', err?.message);
            }

            const headers = new Headers(init?.headers || {});
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(url, { ...init, headers });
          },

          onopen: async (response) => {
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
              console.log('[useRealtimeUpdates] SSE-Verbindung hergestellt.');
              retryDelayMs = 1000; // Backoff zurücksetzen
              return;
            }
            if (response.status === 401 || response.status === 403) {
              throw new FatalSSEError(`Auth-Fehler: ${response.status}`);
            }
            throw new Error(`Unerwarteter Status: ${response.status}`);
          },

          onmessage: (ev) => {
            // Heartbeats (Kommentar-Zeilen) kommen hier nicht an.
            if (!ev.data) return;
            try {
              const payload = JSON.parse(ev.data);
              if (ev.event === 'ready') {
                console.log('[useRealtimeUpdates] Ready:', payload);
                return;
              }
              // Phase 1: Log + Callback
              console.log('[useRealtimeUpdates] changes:', payload);
              onUpdateRef.current?.(payload);
            } catch (err) {
              console.warn('[useRealtimeUpdates] Parse-Fehler:', err?.message, ev.data);
            }
          },

          onerror: (err) => {
            // Fatal → Abbruch (fetch-event-source wirft dann hoch)
            if (err instanceof FatalSSEError) {
              console.error('[useRealtimeUpdates]', err.message);
              throw err;
            }
            // Transient → exponential backoff via Rückgabewert (ms)
            console.warn('[useRealtimeUpdates] Verbindung unterbrochen, retry in', retryDelayMs, 'ms');
            const delay = retryDelayMs;
            retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
            return delay;
          },

          onclose: () => {
            // Server hat sauber geschlossen – fetch-event-source reconnected automatisch,
            // außer der signal wurde aborted.
            console.log('[useRealtimeUpdates] SSE-Verbindung geschlossen.');
          },
        });
      } catch (err) {
        if (err instanceof FatalSSEError) {
          console.error('[useRealtimeUpdates] Fatal, kein Reconnect:', err.message);
        } else if (!abortController.signal.aborted) {
          console.error('[useRealtimeUpdates] Unerwarteter Fehler:', err?.message);
        }
      }
    };

    connect();

    return () => {
      abortController.abort();
    };
  }, []); // Nur einmal pro Mount
}