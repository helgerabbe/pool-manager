import React from 'react';
import { BookOpen, Paperclip, Users, NotebookPen, Layers, Hammer } from 'lucide-react';

export const REITER = [
  { k: 'bau', l: 'Stundenbau', sub: 'Ablauf bauen', icon: Hammer },
  { k: 'fundament', l: 'Fundament', sub: 'Thema & Ziel der Stunde', icon: Layers },
  { k: 'fach', l: 'Fachinhalt', sub: 'Wissen der Einheit', icon: BookOpen },
  { k: 'mat', l: 'Materialien', sub: 'Dateien & Lehrwerk', icon: Paperclip },
  { k: 'lg', l: 'Lerngruppe', sub: 'Klasse & Einschätzung', icon: Users },
  { k: 'bisher', l: 'Einheit bisher', sub: 'Gehaltene Stunden', icon: NotebookPen },
];

/** Obere Menüleiste (Ribbon): öffnet die Bereiche im Hauptbereich. Ausgelegt für bis zu zehn Reiter. */
export default function WissensLeiste({ aktiv, onAktiv, zahlen = {} }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto">
      {REITER.map(({ k, l, sub, icon: I }) => {
        const an = aktiv === k;
        return (
          <button key={k} onClick={() => onAktiv(k)}
            className={`group flex min-w-[8.5rem] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-200 ${an ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${an ? 'bg-primary-foreground/15' : 'bg-primary/10 text-primary group-hover:bg-accent group-hover:text-accent-foreground'}`}>
              <I className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{l}{zahlen[k] != null && <span className={`ml-1.5 rounded-full px-1.5 text-[10px] ${an ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{zahlen[k]}</span>}</span>
              <span className={`block truncate text-[11px] ${an ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{sub}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}