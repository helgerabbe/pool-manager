import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

const HEARTBEAT_INTERVAL = 15_000;
const STALE_THRESHOLD_MS = 35_000;

export default function Dashboard() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const myRecordIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  // Benutzer-Entity für Rollen (Administrator, Fachschaftsleitung etc.)
  const { data: benutzerList = [] } = useQuery({
    queryKey: ['benutzer-all'],
    queryFn: () => base44.entities.Benutzer.list(),
  });

  // Eigene Presence registrieren + Realtime-Subscription
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const user = await base44.auth.me();
      if (!user || !mounted) return;

      const now = new Date().toISOString();

      // Bestehende eigene Einträge (alle current_view) bereinigen
      const existing = await base44.entities.ActiveUsersPresence.filter({
        user_email: user.email,
      });

      let recordId;
      if (existing.length > 0) {
        // Ersten behalten, Rest löschen
        recordId = existing[0].id;
        await base44.entities.ActiveUsersPresence.update(recordId, {
          last_seen_at: now,
          user_name: user.full_name || user.email,
          current_view: 'dashboard',
        });
        for (let i = 1; i < existing.length; i++) {
          base44.entities.ActiveUsersPresence.delete(existing[i].id);
        }
      } else {
        const created = await base44.entities.ActiveUsersPresence.create({
          user_email: user.email,
          user_name: user.full_name || user.email,
          current_view: 'dashboard',
          last_seen_at: now,
        });
        recordId = created.id;
      }

      if (!mounted) {
        base44.entities.ActiveUsersPresence.delete(recordId);
        return;
      }

      myRecordIdRef.current = recordId;

      const loadPresence = async () => {
        const all = await base44.entities.ActiveUsersPresence.list();
        const cutoff = Date.now() - STALE_THRESHOLD_MS;

        // Deduplizieren nach E-Mail (neuester Eintrag gewinnt), Stale rausfiltern
        const byEmail = {};
        for (const entry of all) {
          const ts = new Date(entry.last_seen_at).getTime();
          if (ts <= cutoff) continue;
          if (!byEmail[entry.user_email] || ts > new Date(byEmail[entry.user_email].last_seen_at).getTime()) {
            byEmail[entry.user_email] = entry;
          }
        }

        if (mounted) {
          setOnlineUsers(Object.values(byEmail));
        }
      };

      await loadPresence();

      const unsubscribe = base44.entities.ActiveUsersPresence.subscribe(() => {
        loadPresence();
      });

      heartbeatRef.current = setInterval(() => {
        if (!myRecordIdRef.current) return;
        base44.entities.ActiveUsersPresence.update(myRecordIdRef.current, {
          last_seen_at: new Date().toISOString(),
        });
      }, HEARTBEAT_INTERVAL);

      return unsubscribe;
    };

    let unsubscribeFn = null;
    init().then(fn => { unsubscribeFn = fn; });

    const cleanup = () => {
      mounted = false;
      clearInterval(heartbeatRef.current);
      if (unsubscribeFn) unsubscribeFn();
      if (myRecordIdRef.current) {
        base44.entities.ActiveUsersPresence.delete(myRecordIdRef.current);
        myRecordIdRef.current = null;
      }
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);

  // Rolle aus Benutzer-Entity ermitteln (Fallback: Base44-Rolle)
  const getRolle = (entry) => {
    const b = benutzerList.find(b => b.user_id === entry.user_email);
    if (b?.rolle) return b.rolle;
    return 'Nutzer';
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-6 items-stretch">
        {/* Titelbild */}
        <div className="rounded-2xl overflow-hidden shadow-md flex-shrink-0 w-2/3">
          <img
            src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/996944c1f_image.png"
            alt="Pool-Manager – Die Orga-App für Freiarbeitszeiten"
            className="w-full h-full object-cover"
            style={{ maxHeight: '480px' }}
          />
        </div>

        {/* Online-Nutzer */}
        <Card className="border-0 shadow-sm flex-1">
          <CardContent className="p-6 flex flex-col h-full">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              Online-Nutzer ({onlineUsers.length})
            </h2>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Keine Nutzer online</p>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map(entry => (
                  <div key={entry.user_email} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.user_name || entry.user_email}</p>
                      <p className="text-xs text-muted-foreground">{getRolle(entry)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}