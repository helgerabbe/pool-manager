import React from 'react';
import { Users, BookOpen, Clock, Target } from 'lucide-react';

const FELDER = [
  { key: 'zielgruppe', label: 'Zielgruppe', icon: Users },
  { key: 'thema', label: 'Thema der Stunde', icon: BookOpen },
  { key: 'dauer', label: 'Dauer', icon: Clock },
  { key: 'leitziel', label: 'Leitziel', icon: Target },
];

/**
 * Steckbrief der Stunde (KI-Stunden-Coach): füllt sich im Gespräch.
 * Noch nicht geklärte Felder bleiben sichtbar als "noch nicht definiert".
 */
export default function StundenSteckbriefCard({ steckbrief = {} }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">Steckbrief der Stunde</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {FELDER.map(({ key, label, icon: Icon }) => {
          const wert = (steckbrief[key] || '').trim();
          return (
            <div key={key} className="flex gap-2">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${wert ? 'text-primary' : 'text-muted-foreground/50'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className={`text-sm ${wert ? 'text-foreground' : 'italic text-muted-foreground/70'}`}>
                  {wert || 'noch nicht definiert'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}