/**
 * WizardChatAenderungen.jsx
 * Lernpaket-Wizard Etappe 2 (2026-08-24): Vom Wizard vorgeschlagene
 * Änderungen an BESTEHENDEN Aktivitäten (neue Aufgabenbeschreibung).
 * Die Lehrkraft sieht alt/neu und kann Vorschläge einzeln verwerfen.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X, PencilLine } from 'lucide-react';

export default function WizardChatAenderungen({ aenderungen, onRemove, disabled }) {
  if (!aenderungen || aenderungen.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
        <PencilLine className="w-3.5 h-3.5" />
        Änderungen an bestehenden Aufgaben ({aenderungen.length})
      </h4>
      {aenderungen.map((ae, i) => (
        <div key={ae.aktivitaet_id} className="flex items-start gap-2 rounded bg-background border border-border px-2 py-1.5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-foreground">{ae.aktivitaet_name}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0">{ae.phase}</Badge>
              {ae.hat_inhalt && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-800 border-amber-200">
                  Inhalt bleibt erhalten
                </Badge>
              )}
            </div>
            {ae.alte_beschreibung && (
              <p className="text-[11px] text-muted-foreground line-through leading-snug line-clamp-2">
                {ae.alte_beschreibung}
              </p>
            )}
            <p className="text-[11px] text-foreground leading-snug">{ae.neue_beschreibung}</p>
            {ae.begruendung && (
              <p className="text-[10px] text-muted-foreground italic">{ae.begruendung}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5 disabled:opacity-50"
            title="Diesen Änderungsvorschlag verwerfen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}