import React from 'react';
import HilfeInhalt from '@/components/ui/HilfeInhalt';

/**
 * Startseite eines Bereichs (Lernziele, Lernpakete, Projekte): erscheint im
 * Inhaltsfenster, solange im Menübaum noch nichts ausgewählt ist, und zeigt
 * die Direkthilfe des Bereichs.
 */
export default function BereichStartseite({ titel, hilfe, icon: Icon }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">{titel}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Wähle links im Menü aus, woran du arbeiten möchtest.</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <HilfeInhalt {...hilfe} />
      </div>
    </div>
  );
}