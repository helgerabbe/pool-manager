/**
 * AktiveNutzerListe.jsx
 *
 * Zeigt dem Admin im Wartungsmodus-Bereich, welche Nutzer die App gerade
 * aktiv verwenden (ActiveUsersPresence, letzte Aktivität < 5 Minuten).
 * So kann vor dem Aktivieren des Wartungsmodus geprüft werden, dass
 * niemand mehr im System arbeitet. Aktualisiert sich alle 15 Sekunden.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Loader2 } from 'lucide-react';

const AKTIV_FENSTER_MS = 5 * 60 * 1000;

export default function AktiveNutzerListe() {
  const { data: presence = [], isLoading } = useQuery({
    queryKey: ['activeUsersPresence'],
    queryFn: () => base44.entities.ActiveUsersPresence.list('-last_activity', 100),
    refetchInterval: 15000,
  });

  const cutoff = Date.now() - AKTIV_FENSTER_MS;
  const aktive = [];
  const seen = new Set();
  for (const p of presence) {
    if (p.is_online === false) continue;
    if (!p.last_activity || new Date(p.last_activity).getTime() < cutoff) continue;
    if (seen.has(p.user_email)) continue;
    seen.add(p.user_email);
    aktive.push(p);
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Users className="w-4 h-4 text-muted-foreground" />
        )}
        Aktuell aktive Nutzer: {isLoading ? '…' : aktive.length}
      </div>
      {!isLoading && aktive.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {aktive.map((p) => (
            <li key={p.user_email} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {p.user_email}
            </li>
          ))}
        </ul>
      )}
      {!isLoading && aktive.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Niemand arbeitet gerade im System — der Wartungsmodus kann gefahrlos aktiviert werden.
        </p>
      )}
    </div>
  );
}