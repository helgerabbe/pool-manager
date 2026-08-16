import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import StundenPhaseSortierButtons from './StundenPhaseSortierButtons';
import StundenPhaseCodeToggle from './StundenPhaseCodeToggle';

/**
 * Struktur-Spalte einer Regieblatt-Phase (2026-08-16): alle organisatorischen
 * Elemente gebündelt und rechtsbündig gestapelt — Bearbeiten, Ampel,
 * Phasen-Art, Freischalt-Code, Sozialform und die Sortier-/Löschaktionen.
 * Links im Regieblatt bleibt dadurch ausschliesslich der Inhalt stehen.
 */
export default function StundenPhaseSteuerspalte({ phase, meta, unvollstaendig, nummer, anzahl, stundeId, offen, onToggle }) {
  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      {onToggle && (
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onToggle}>
          {offen ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Zuklappen</>
          ) : (
            <><Pencil className="w-3.5 h-3.5" /> Bearbeiten <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </Button>
      )}

      {unvollstaendig ? (
        <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-700">
          <AlertTriangle className="w-3 h-3" />
          Unvollständig
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          Vollständig
        </Badge>
      )}

      <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>

      <StundenPhaseCodeToggle phase={phase} stundeId={stundeId} />

      {phase.methode_sozialform && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" />
          {phase.methode_sozialform}
        </span>
      )}

      <StundenPhaseSortierButtons phase={phase} index={nummer - 1} anzahl={anzahl} stundeId={stundeId} />
    </div>
  );
}