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

          // Frischer Token bei JEDEM (Re-)Connect – kein Closure-Caching.
          // Wir kombinieren drei Auth-Pfade, weil die Base44-SDK je nach
          // Version Token entweder in localStorage hält oder über Cookies
          // arbeitet:
          //   1. Token aus localStorage (Base44-Konvention),
          //   2. SDK-Methoden falls vorhanden (getToken / me),
          //   3. credentials:'include' für Cookie-basierte Sessions.
          fetch: async (url, init) => {
            let token = null;

            // 1) localStorage: Suche nach base44-Token-Keys.
            try {
              const keys = Object.keys(localStorage);
              const tokenKey = keys.find(
                (k) => k.startsWith('base44_') && k.endsWith('_token')
              );
              if (tokenKey) token = localStorage.getItem(tokenKey);
            } catch { /* SSR / Storage gesperrt */ }

            // 2) SDK-Fallback: getToken() ODER me() um Session aufzufrischen.
            if (!token) {
              try {
                if (typeof base44.auth?.getToken === 'function') {
                  token = await base44.auth.getToken();
                }
                if (!token && typeof base44.auth?.me === 'function') {
                  await base44.auth.me();
                  if (typeof base44.auth?.getToken === 'function') {
                    token = await base44.auth.getToken();
                  }
                }
              } catch (err) {
                console.warn('[useRealtimeUpdates] SDK-Token-Abruf fehlgeschlagen:', err?.message);
              }
            }

            const headers = new Headers(init?.headers || {});
            if (token) headers.set('Authorization', `Bearer ${token}`);
            // 3) Cookies mitsenden (Cookie-basierte Sessions).
            return fetch(url, { ...init, headers, credentials: 'include' });
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
          // 401/403: Session-Token wird im SSE-Stream nicht erkannt.
          // Realtime-Updates fallen aus, die App funktioniert weiter über
          // normale Polling-Queries. Bewusst nur Warn-Level, kein Error,
          // damit die Konsole nicht zugespammt wird.
          console.warn('[useRealtimeUpdates] Realtime deaktiviert –', err.message);
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