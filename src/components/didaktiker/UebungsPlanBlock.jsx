import React from 'react';
import { Brain, Lightbulb } from 'lucide-react';

/**
 * Zeigt, was der Didaktiker für eine Übung GEDACHT hat, bevor gebaut wird:
 * die gedankliche Operation und die Aufgaben-Idee. Nur gerendert, wenn
 * mindestens eines davon vorliegt.
 */
export default function UebungsPlanBlock({ operation, aufgabenIdee, begruendung }) {
  if (!operation && !aufgabenIdee) return null;

  return (
    <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3 text-xs">
      {operation && (
        <div className="flex gap-2">
          <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-foreground">
            <span className="font-semibold">Gedankliche Operation: </span>
            {operation}
          </p>
        </div>
      )}
      {aufgabenIdee && (
        <div className="flex gap-2">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Aufgaben-Idee: </span>
            {aufgabenIdee}
          </p>
        </div>
      )}
      {begruendung && (
        <p className="pl-5 italic text-muted-foreground">Standardformat gewählt: {begruendung}</p>
      )}
    </div>
  );
}