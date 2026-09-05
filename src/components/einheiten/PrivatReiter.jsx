/**
 * PrivatReiter.jsx
 *
 * Zwei Reiter in der Privaten Bibliothek: „Mein Unterricht" (Stunden und
 * Übungsblöcke, nach Fach und Jahrgang geordnet) und „Meine Einheiten"
 * (vollständige Einheiten für Moodle). Getrennte Reiter halten das Dashboard
 * ruhig — man sieht immer nur eine Welt.
 */
import React from 'react';
import { BookOpen, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const REITER = [
  { key: 'unterricht', label: 'Mein Unterricht', icon: LayoutGrid },
  { key: 'einheiten', label: 'Meine Einheiten', icon: BookOpen },
];

export default function PrivatReiter({ aktiv, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
      {REITER.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            aktiv === key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}