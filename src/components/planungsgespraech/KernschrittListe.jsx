import React from 'react';
import { MessageCircle } from 'lucide-react';

/** Grober Stundenverlauf (4–6 Kernschritte). Ein Klick auf einen Schritt startet das Gespräch darüber. */
export default function KernschrittListe({ schritte, onAnsprechen, gesperrt }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p className="font-display font-bold">Grober Stundenverlauf</p>
      {!schritte?.length && <p className="text-sm text-muted-foreground">Der Verlauf entsteht im Gespräch.</p>}
      {(schritte || []).map((s, i) => (
        <button key={i} disabled={gesperrt} onClick={() => onAnsprechen(s)}
          className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary disabled:opacity-60 ${s.neu ? 'border-accent bg-accent/10' : 'bg-background'}`}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{s.name}</span>
            <span className="block text-sm text-muted-foreground">{s.satz}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100"><MessageCircle className="h-3.5 w-3.5" /> Darüber sprechen</span>
        </button>
      ))}
    </div>
  );
}