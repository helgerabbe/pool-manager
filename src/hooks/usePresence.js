/**
 * usePresence (global, server-side)
 * ──────────────────────────────────
 * Trackt aktive Nutzer in der App geräteübergreifend via ActiveUsersPresence-Entity.
 *
 * Optimierungen:
 * - Heartbeat alle 30s (reduziert API-Last)
 * - STALE_THRESHOLD 120s (Puffer für 3+ verpasste Pings)
 * - Page Visibility API: sofortiger Heartbeat bei Tab-Reaktivierung
 * - Error-Catching im Interval: kein Absturz bei 502/Rate-Limit
 * - Deduplizierung nach E-Mail (neuester Eintrag gewinnt)
 *
 * Rückgabe: { onlineUsers, count }
 */
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '@/services/AuthService';
import {
  listPresence,
  filterPresenceByEmail,
  createPresenceRecord,
  updatePresenceRecord,
  deletePresenceRecord,
  subscribeToPresence,
} from '@/services/PresenceService';

const HEARTBEAT_INTERVAL = 30_000;  // 30s
const STALE_THRESHOLD_MS = 120_000; // 120s = Puffer für 3 verpasste Pings
const DEBOUNCE_MS = 3_000;

export function usePresence(currentView = 'dashboard') {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const myRecordIdRef   = useRef(null);
  const myEmailRef      = useRef(null);
  const heartbeatRef    = useRef(null);
  const unsubscribeRef  = useRef(null);
  const debounceTimerRef = useRef(null);
  const mountedRef      = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ── Heartbeat-Funktion (wiederverwendbar für Visibility-Event) ──
    const sendHeartbeat = async () => {
      if (!myRecordIdRef.current) return;
      try {
        await updatePresenceRecord(myRecordIdRef.current, {
          last_seen_at: new Date().toISOString(),
          current_view: currentView,
        });
      } catch (err) {
        // Eintrag wurde extern gelöscht – Record-Ref zurücksetzen
        console.warn('[usePresence] Heartbeat failed:', err.message);
        myRecordIdRef.current = null;
      }
    };

    // ── Presence-Liste laden + Stale-Filter + Deduplizierung ──
    const loadPresence = async () => {
      try {
        const all = await listPresence();
        const cutoff = Date.now() - STALE_THRESHOLD_MS;

        // Deduplizieren nach E-Mail (neuester Eintrag pro Nutzer)
        const byEmail = {};
        for (const entry of all) {
          if (entry.user_email === myEmailRef.current) continue;
          const ts = new Date(entry.last_seen_at).getTime();
          if (ts <= cutoff) continue;
          if (!byEmail[entry.user_email] || ts > new Date(byEmail[entry.user_email].last_seen_at).getTime()) {
            byEmail[entry.user_email] = entry;
          }
        }

        if (mountedRef.current) {
          setOnlineUsers(Object.values(byEmail));
        }
      } catch (err) {
        console.warn('[usePresence] loadPresence failed:', err.message);
      }
    };

    const init = async () => {
      const user = await getCurrentUser();
      if (!user || !mountedRef.current) return;

      myEmailRef.current = user.email;
      const now = new Date().toISOString();

      // Bestehende eigene Einträge bereinigen
      let existing = [];
      try {
        existing = await filterPresenceByEmail(user.email);
      } catch (err) {
        console.warn('[usePresence] Filter failed:', err.message);
      }

      if (!mountedRef.current) return;

      let recordId;
      if (existing.length > 0) {
        recordId = existing[0].id;
        try {
          await updatePresenceRecord(recordId, {
            last_seen_at: now,
            user_name: user.full_name || user.email,
            current_view: currentView,
          });
          // Duplikate löschen
          for (let i = 1; i < existing.length; i++) {
            deletePresenceRecord(existing[i].id).catch(() => {});
          }
        } catch {
          // Record gelöscht – neu erstellen
          try {
            const created = await createPresenceRecord({
              user_email: user.email,
              user_name: user.full_name || user.email,
              current_view: currentView,
              last_seen_at: now,
            });
            recordId = created.id;
          } catch (err) {
            console.warn('[usePresence] Could not create record:', err.message);
            return;
          }
        }
      } else {
        try {
          const created = await createPresenceRecord({
            user_email: user.email,
            user_name: user.full_name || user.email,
            current_view: currentView,
            last_seen_at: now,
          });
          recordId = created.id;
        } catch (err) {
          console.warn('[usePresence] Could not create record:', err.message);
          return;
        }
      }

      if (!mountedRef.current) {
        if (recordId) deletePresenceRecord(recordId).catch(() => {});
        return;
      }

      myRecordIdRef.current = recordId;

      // Erste Ladung
      await loadPresence();

      // Realtime-Subscription mit Debounce
      unsubscribeRef.current = subscribeToPresence(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(loadPresence, DEBOUNCE_MS);
      });

      // Heartbeat-Interval (mit Error-Catching → Interval läuft immer weiter)
      heartbeatRef.current = setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL);

      // Page Visibility API: sofortiger Heartbeat bei Tab-Reaktivierung
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          sendHeartbeat();
          loadPresence();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup inkl. visibilitychange-Listener
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    let cleanupVisibility = null;
    init().then(fn => { cleanupVisibility = fn; });

    const cleanup = () => {
      mountedRef.current = false;
      clearInterval(heartbeatRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (cleanupVisibility) cleanupVisibility();
      if (myRecordIdRef.current) {
        const id = myRecordIdRef.current;
        myRecordIdRef.current = null;
        deletePresenceRecord(id).catch(() => {});
      }
    };

    const handleUnload = () => {
      mountedRef.current = false;
      clearInterval(heartbeatRef.current);
      if (myRecordIdRef.current) {
        try { deletePresenceRecord(myRecordIdRef.current); } catch {}
        myRecordIdRef.current = null;
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      cleanup();
    };
  }, [currentView]);

  return { onlineUsers, count: onlineUsers.length };
}