import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { pruefeFragment } from '@/lib/aufgabeFragment';
import { HinweisText } from '@/components/schritte/SchrittHinweis';

/**
 * OffenSchrittEditor
 * ──────────────────
 * Editor für einen Schritt vom Typ 'offen': eine interaktive Aufgabe, die im
 * Gespräch mit dem Assistenten gebaut wird.
 *
 * Hier gibt es bewusst KEIN Textfeld für den Quelltext. Lehrkräfte arbeiten
 * ausschließlich im Dialog; ein Code-Editor wäre eine Einladung, etwas
 * kaputtzumachen, das niemand mehr reparieren kann. Diese Spalte zeigt
 * deshalb nur den Stand des Schritts und verweist auf das Gespräch.
 *
 * Die Werkstatt reicht `onGespraechOeffnen` durch. Fehlt der Handler (etwa
 * weil der Schritt außerhalb der Werkstatt bearbeitet wird), bleibt der
 * Schritt trotzdem lesbar — das Bauen ist dann nur nicht von hier aus
 * erreichbar.
 */
export default function OffenSchrittEditor({ schritt, onGespraechOeffnen }) {
  const offen = schritt.offen || {};
  const hatInhalt = !!(offen.fragment?.trim() || offen.snapshot_html?.trim() || offen.snapshot_url?.trim());

  const warnungen = useMemo(
    () => (offen.fragment ? pruefeFragment(offen.fragment) : []),
    [offen.fragment],
  );

  return (
    <div className="space-y-4">
      {hatInhalt ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Für diesen Schritt ist eine Aufgabe gebaut.
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            In der Mitte sehen Sie sie so, wie die Schüler sie sehen.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Für diesen Schritt ist noch keine Aufgabe gebaut.
          </p>
        </div>
      )}

      {warnungen.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Das sollten Sie sich ansehen
          </p>
          <ul className="space-y-1">
            {warnungen.map((w, i) => (
              <li key={i} className="text-xs text-amber-800 leading-relaxed">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {onGespraechOeffnen && (
        <div className="space-y-2">
          <Button onClick={onGespraechOeffnen} className="gap-2 w-full">
            <Sparkles className="w-4 h-4" />
            {hatInhalt ? 'Aufgabe im Gespräch ändern' : 'Aufgabe im Gespräch bauen'}
          </Button>
          <HinweisText>
            Sie beschreiben, was die Aufgabe können soll — der Assistent baut sie. Frühere Stände
            bleiben erhalten, Sie können jederzeit zurückspringen.
          </HinweisText>
        </div>
      )}
    </div>
  );
}
