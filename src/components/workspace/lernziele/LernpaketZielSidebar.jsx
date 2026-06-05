/**
 * LernpaketZielSidebar
 * ────────────────────
 * Kompakte, klickbare Liste aller Lernpakete (gruppiert nach Themenfeld)
 * für den Lernziele-Tab. Zeigt pro Paket die Anzahl Lernziele. Auswahl
 * steuert, welches Paket im Detailbereich rechts angezeigt wird.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Target, Layers } from 'lucide-react';

export default function LernpaketZielSidebar({ gruppen, zielCount, selectedPaketId, onSelect }) {
  return (
    <nav className="h-full overflow-y-auto p-2 space-y-4">
      {gruppen.map((gruppe) => (
        <div key={gruppe.id}>
          <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {gruppe.titel}
          </p>
          <ul className="space-y-0.5">
            {gruppe.pakete.map((paket) => {
              const count = zielCount.get(paket.id) || 0;
              const active = paket.id === selectedPaketId;
              return (
                <li key={paket.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(paket.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <Layers className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-primary-foreground' : 'text-primary')} />
                    <span className="flex-1 min-w-0 truncate text-xs font-medium">{paket.titel_des_pakets}</span>
                    <span
                      className={cn(
                        'shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                        active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Target className="w-2.5 h-2.5" /> {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}