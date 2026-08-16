import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StundenPhaseCodeToggle from './StundenPhaseCodeToggle';

/**
 * Struktur-Leiste einer Regieblatt-Phase (2026-08-16, kompakt):
 * nur das Nötigste oben rechts — Ampel (Symbol), Freischalt-Code und
 * ein kleiner Aufklapp-Button. Sortieren/Löschen liegen als Hover-Leiste
 * unten rechts in der Karte (StundenPhaseCard).
 */
export default function StundenPhaseSteuerspalte({ phase, unvollstaendig, stundeId, offen, onToggle }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {unvollstaendig ? (
        <span title="Unvollständig" className="text-red-600"><AlertTriangle className="w-4 h-4" /></span>
      ) : (
        <span title="Vollständig" className="text-emerald-600"><CheckCircle2 className="w-4 h-4" /></span>
      )}

      <StundenPhaseCodeToggle phase={phase} stundeId={stundeId} />

      {onToggle && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title={offen ? 'Zuklappen' : 'Bearbeiten (aufklappen)'}
          onClick={onToggle}
        >
          {offen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <span className="flex items-center">
              <Pencil className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3" />
            </span>
          )}
        </Button>
      )}
    </div>
  );
}