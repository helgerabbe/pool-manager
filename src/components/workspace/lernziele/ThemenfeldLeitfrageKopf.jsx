/**
 * ThemenfeldLeitfrageKopf
 * ───────────────────────
 * Kopfzeile über den Lernzielen eines Pakets: das Themenfeld und seine
 * Leitfrage. Die Leitfrage hängt am THEMENFELD (nicht am Lernpaket oder
 * Lernziel) und wird im Struktur-Board (Tab 2) gepflegt — hier wird sie nur
 * gezeigt, damit der Zusammenhang zur Lernlandkarte sichtbar ist.
 */
import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ThemenfeldLeitfrageKopf({ themenfeld }) {
  if (!themenfeld) return null;
  return (
    <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        Themenfeld · {themenfeld.titel}
      </p>
      {themenfeld.leitfrage ? (
        <p className="mt-1 flex items-start gap-2 text-base font-medium text-primary leading-snug">
          <HelpCircle className="w-4 h-4 mt-1 shrink-0" />
          <span>„{themenfeld.leitfrage}"</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground italic">
          Noch keine Leitfrage — im Struktur-Board (Tab 2) eintragen.
        </p>
      )}
    </div>
  );
}