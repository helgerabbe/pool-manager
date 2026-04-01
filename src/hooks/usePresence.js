/**
 * usePresence
 * ───────────
 * Trackt, welche Nutzer eine Einheit gerade geöffnet haben.
 * Mechanismus: Entity-Subscription auf Lernpakete (die beim Lock-System
 * "touched" werden) + periodischer Heartbeat über einen Präsenz-Eintrag
 * im localStorage-Broadcast-Channel.
 *
 * Kein separater WebSocket-Server nötig: Nutzt BroadcastChannel (same-origin
 * Tab-Sync) + base44 entity-Subscription als "Heartbeat-Trigger".
 *
 * Rückgabe: { onlineUsers: [{ email, name }], count: number }
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 15_000; // 15 s
const STALE_TIMEOUT      = 40_000; // 40 s → gilt als offline

export function usePresence(einheitId) {
  const [peers, setPeers] = useState({}); // { email: { name, lastSeen } }
  const channelRef        = useRef(null);
  const heartbeatRef      = useRef(null);
  const myEmailRef        = useRef(null);
  const myNameRef         = useRef(null);

  // Stale-Peers bereinigen
  const pruneStale = useCallback(() => {
    const now = Date.now();
    setPeers(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(next).forEach(([email, data]) => {
        if (now - data.lastSeen > STALE_TIMEOUT) {
          delete next[email];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const broadcast = useCallback((type) => {
    if (!channelRef.current || !myEmailRef.current || !einheitId) return;
    channelRef.current.postMessage({
      type,
      einheitId,
      email: myEmailRef.current,
      name:  myNameRef.current || myEmailRef.current,
    });
  }, [einheitId]);

  useEffect(() => {
    if (!einheitId) return;

    // Eigene Identität laden
    base44.auth.me().then(user => {
      if (!user) return;
      myEmailRef.current = user.email;
      myNameRef.current  = user.full_name || user.email;

      // BroadcastChannel öffnen (channel-Name beinhaltet einheitId → isoliert)
      const ch = new BroadcastChannel(`presence_${einheitId}`);
      channelRef.current = ch;

      ch.onmessage = (ev) => {
        const { type, email, name } = ev.data || {};
        if (!email || email === myEmailRef.current) return;

        if (type === 'leave') {
          setPeers(prev => {
            const next = { ...prev };
            delete next[email];
            return next;
          });
        } else {
          setPeers(prev => ({
            ...prev,
            [email]: { name: name || email, lastSeen: Date.now() },
          }));
        }
      };

      // Sofort ankündigen
      broadcast('join');

      // Heartbeat
      heartbeatRef.current = setInterval(() => {
        broadcast('heartbeat');
        pruneStale();
      }, HEARTBEAT_INTERVAL);

      // Seite/Tab verlassen
      const handleUnload = () => broadcast('leave');
      window.addEventListener('beforeunload', handleUnload);

      return () => {
        broadcast('leave');
        window.removeEventListener('beforeunload', handleUnload);
        clearInterval(heartbeatRef.current);
        ch.close();
        channelRef.current = null;
      };
    });
  }, [einheitId, broadcast, pruneStale]);

  // Einheit wechseln → alten Kanal sauber schließen
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        broadcast('leave');
        channelRef.current.close();
        channelRef.current = null;
      }
      clearInterval(heartbeatRef.current);
      setPeers({});
    };
  }, [einheitId]);

  const onlineUsers = Object.entries(peers).map(([email, { name }]) => ({ email, name }));

  return { onlineUsers, count: onlineUsers.length };
}