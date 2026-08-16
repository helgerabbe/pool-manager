import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StundenPhaseSortierButtons from './StundenPhaseSortierButtons';
import StundenPhaseCodeToggle from './StundenPhaseCodeToggle';

/**
 * Struktur-Leiste einer Regieblatt-Phase (2026-08-16, kompakt):
 * alle organisatorischen Elemente in EINER schmalen Zeile oben rechts —
 * Ampel (nur Symbol), Phasen-Art, Freischalt-Code, Bearbeiten.
 * Die Sortier-/Löschaktionen erscheinen erst beim Überfahren der Karte,
 * damit die Phasenkarten flach bleiben und viele Phasen auf einen Blick
 * sichtbar sind.
 */
export default function StundenPhaseSteuerspalte({ phase, meta, unvollstaendig, nummer, anzahl, stundeId, offen, onToggle }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        <StundenPhaseSortierButtons phase={phase} index={nummer - 1} anzahl={anzahl} stundeId={stundeId} />
      </span>

      {unvollstaendig ? (
        <span title="Unvollständig" className="text-red-600"><AlertTriangle className="w-4 h-4" /></span>
      ) : (
        <span title="Vollständig" className="text-emerald-600"><CheckCircle2 className="w-4 h-4" /></span>
      )}

      <Badge variant="outline" className={`${meta.badge} text-[10px] px-1.5 py-0`}>{meta.label}</Badge>

      <StundenPhaseCodeToggle phase={phase} stundeId={stundeId} />

      {onToggle && (
        <Button size="sm" variant="ghost" className="gap-1 h-6 px-2 text-xs" onClick={onToggle}>
          {offen ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Zuklappen</>
          ) : (
            <><Pencil className="w-3.5 h-3.5" /> Bearbeiten</>
          )}
        </Button>
      )}
    </div>
  );
}