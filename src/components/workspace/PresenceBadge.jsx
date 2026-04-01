/**
 * PresenceBadge
 * ─────────────
 * Zeigt "👥 X Kollegen aktiv" in der Workspace-Bar.
 * Hover-Tooltip listet Namen auf (sofort, kein Delay).
 */
import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PresenceBadge({ onlineUsers = [] }) {
  const [open, setOpen] = useState(false);
  const count = onlineUsers.length;

  if (count === 0) return null;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
        'bg-green-50 text-green-700 border border-green-200 cursor-default select-none',
        'transition-colors hover:bg-green-100'
      )}>
        <Users className="w-3.5 h-3.5" />
        <span>{count} {count === 1 ? 'Kollege' : 'Kollegen'} aktiv</span>
        {/* Puls-Dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      </div>

      {/* Sofort-Tooltip (kein Delay) */}
      {open && (
        <div className={cn(
          'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50',
          'bg-slate-800 text-white rounded-lg shadow-xl py-2 px-3 min-w-[160px]',
          'pointer-events-none'
        )}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            Gerade aktiv
          </p>
          <ul className="space-y-1">
            {onlineUsers.map(u => (
              <li key={u.email} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="truncate max-w-[140px]">{u.name}</span>
              </li>
            ))}
          </ul>
          {/* Pfeil nach unten */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}