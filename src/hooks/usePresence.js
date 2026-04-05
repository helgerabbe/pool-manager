/**
 * usePresence (server-side)
 * ─────────────────────────
 * Trackt, welche Nutzer eine Einheit gerade geöffnet haben – geräteübergreifend.
 * Mechanismus: base44 Entity `ActiveUsersPresence` + Realtime-Subscription.
 *
 * - Beim Mounten: eigenen Eintrag erstellen/aktualisieren
 * - Heartbeat alle 15s: last_seen_at aktualisieren
 * - Subscription: andere Nutzer in Echtzeit sehen
 * - Beim Unmounten / beforeunload: eigenen Eintrag löschen
 *
 * Rückgabe: { onlineUsers: [{ email, name }], count: number }
 */
import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 15_000; // 15s
const STALE_THRESHOLD_MS = 30_000; // 30s

export function usePresence(einheitId) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const myRecordIdRef  = useRef(null);
  const myEmailRef     = useRef(null);
  const heartbeatRef   = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!einheitId) return;

    let mounted = true;

    const init = async () => {
      const user = await base44.auth.me();
      if (!user || !mounted) return;

      myEmailRef.current = user.email;
      const now = new Date().toISOString();

      // Existierenden Eintrag suchen (eigener Nutzer, selbe Einheit)
      const existing = await base44.entities.ActiveUsersPresence.filter({
        user_email: user.email,
        current_view: einheitId,
      });

      if (!mounted) return;

      let recordId;
      if (existing.length > 0) {
        recordId = existing[0].id;
        try {
          await base44.entities.ActiveUsersPresence.update(recordId, {
            last_seen_at: now,
            user_name: user.full_name || user.email,
          });
        } catch {
          // Record wurde extern gelöscht – neu erstellen
          const created = await base44.entities.ActiveUsersPresence.create({
            user_email: user.email,
            user_name: user.full_name || user.email,
            current_view: einheitId,
            last_seen_at: now,
          });
          recordId = created.id;
        }
      } else {
        const created = await base44.entities.ActiveUsersPresence.create({
          user_email: user.email,
          user_name: user.full_name || user.email,
          current_view: einheitId,
          last_seen_at: now,
        });
        recordId = created.id;
      }

      if (!mounted) {
        // Wenn in der Zwischenzeit unmounted, sofort wieder löschen
        try {
          base44.entities.ActiveUsersPresence.delete(recordId);
        } catch {
          // Ignorieren wenn Record nicht existiert
        }
        return;
      }

      myRecordIdRef.current = recordId;

      // Hilfsfunktion: Anwesenheitsliste aus DB laden und stale-Filter anwenden
      const loadPresence = async () => {
        const all = await base44.entities.ActiveUsersPresence.filter({
          current_view: einheitId,
        });
        const cutoff = Date.now() - STALE_THRESHOLD_MS;
        const active = all.filter(entry => {
          if (entry.user_email === myEmailRef.current) return false;
          return new Date(entry.last_seen_at).getTime() > cutoff;
        });
        if (mounted) {
          setOnlineUsers(active.map(e => ({ email: e.user_email, name: e.user_name || e.user_email })));
        }
      };

      // Erste Ladung
      await loadPresence();

      // Realtime-Subscription: bei jeder Änderung in der Tabelle neu laden
      unsubscribeRef.current = base44.entities.ActiveUsersPresence.subscribe(() => {
        loadPresence();
      });

      // Heartbeat: eigenes last_seen_at aktualisieren
      heartbeatRef.current = setInterval(async () => {
        if (!myRecordIdRef.current) return;
        try {
          await base44.entities.ActiveUsersPresence.update(myRecordIdRef.current, {
            last_seen_at: new Date().toISOString(),
          });
        } catch {
          // Eintrag wurde extern gelöscht – Ref zurücksetzen
          myRecordIdRef.current = null;
        }
      }, HEARTBEAT_INTERVAL);
    };

    // Cleanup-Funktion: eigenen Eintrag löschen
    const cleanup = () => {
      mounted = false;
      clearInterval(heartbeatRef.current);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (myRecordIdRef.current) {
        try {
          base44.entities.ActiveUsersPresence.delete(myRecordIdRef.current);
        } catch {
          // Ignorieren wenn Record nicht mehr existiert
        }
        myRecordIdRef.current = null;
      }
    };

    // beforeunload: Eintrag sofort entfernen
    const handleUnload = () => cleanup();
    window.addEventListener('beforeunload', handleUnload);

    init();

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      cleanup();
    };
  }, [einheitId]);

  return { onlineUsers, count: onlineUsers.length };
}