/**
 * VerknuepfteLernzieleBlock.jsx
 *
 * Read-only-Block im KI-Tutor-Prompt (Ebene-2-Aufgaben), der alle mit der
 * Aufgabe verknüpften Lernziele auflistet – jeweils mit dem zugehörigen
 * Lernpaket (Titel) oder dem Hinweis, dass (noch) kein Lernpaket existiert.
 *
 * Diese Information wird zusätzlich in die System-Anweisung des KI-Tutors
 * eingebettet (siehe generateBrianSegments), damit Brian einen Schüler
 * gezielt auf das richtige Lernpaket verweisen kann, wenn ein Lernziel
 * noch nicht erreicht wurde.
 */

import React from 'react';
import { Target, Package, AlertCircle } from 'lucide-react';

export default function VerknuepfteLernzieleBlock({ items = [] }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Verknüpfte Lernziele &amp; Lernpakete
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Wird in die System-Anweisung des KI-Tutors eingebettet. Brian verweist Schüler bei nicht erreichten Zielen auf das jeweilige Lernpaket.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Noch keine Lernziele verknüpft. Bitte im Tab „Lernzielanalyse" zuordnen.</span>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-sm"
            >
              <Target className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground leading-snug">{item.text}</p>
                {item.lernpaket ? (
                  <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                    <Package className="w-3 h-3 shrink-0" />
                    Lernpaket: <span className="font-medium">{item.lernpaket}</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Kein zugeordnetes Lernpaket
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}