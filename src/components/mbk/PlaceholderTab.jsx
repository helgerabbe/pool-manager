/**
 * PlaceholderTab.jsx
 *
 * Generischer "Coming Soon"-Platzhalter für die Tabs 2–5 der MBK-Konsole.
 * Wird ersetzt, sobald der jeweilige Generator implementiert ist.
 */
import React from 'react';
import { Construction } from 'lucide-react';

export default function PlaceholderTab({ title, description }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-3">
      <Construction className="w-8 h-8 mx-auto text-muted-foreground/60" />
      <div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          {description}
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground italic">
        Wird in einer der nächsten Ausbau-Stufen implementiert.
      </p>
    </div>
  );
}