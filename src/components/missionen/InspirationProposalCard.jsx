/**
 * InspirationProposalCard — Phase 2 / PR5.
 *
 * Stellt einen vom Backend gelieferten Aufgaben-Vorschlag dar:
 *   - Titel
 *   - Aufgabenstellung
 *   - Schwierigkeitsgrad (1–3 Sterne)
 *   - Mission-Badge
 *   - Material-Checkliste (nur wenn material_level > 0 und required_materials gesetzt)
 *   - Didaktischer Hinweis (für die Lehrkraft)
 *
 * Wenn `loading=true`, wird die Karte mit reduzierter Deckkraft + Skeleton-
 * Overlay dargestellt — der vorherige Vorschlag bleibt sichtbar (smoother
 * Übergang beim "Neu würfeln", Entscheidungsprotokoll Phase 2 Punkt 8).
 */
import React from 'react';
import MissionBadge from '@/components/missionen/MissionBadge';
import { Star, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function StarsRow({ grad }) {
  const safe = [1, 2, 3].includes(grad) ? grad : 2;
  return (
    <div className="flex gap-0.5" title={`Schwierigkeitsgrad: ${safe} von 3`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={cn(
            'w-3.5 h-3.5',
            n <= safe ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export default function InspirationProposalCard({ proposal, loading = false, materialLevel }) {
  if (!proposal) return null;

  const showMaterials = materialLevel > 0 && !!proposal.required_materials;

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-5 space-y-4 transition-opacity',
        loading && 'opacity-50'
      )}
    >
      {/* Skeleton-Overlay beim "Neu würfeln" */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl backdrop-blur-[1px] z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-medium">Neuer Vorschlag wird generiert…</span>
          </div>
        </div>
      )}

      {/* Header: Mission + Schwierigkeit */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <MissionBadge missionId={proposal.mission_type} />
        <StarsRow grad={proposal.schwierigkeitsgrad} />
      </div>

      {/* Titel */}
      <div>
        <h3 className="text-lg font-semibold leading-tight text-foreground">
          {proposal.titel || '(Titel fehlt)'}
        </h3>
      </div>

      {/* Aufgabenstellung */}
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {proposal.aufgabenstellung || '(Aufgabenstellung fehlt)'}
      </div>

      {/* Material-Checkliste */}
      {showMaterials && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-900 mb-0.5">Du benötigst für diese Aufgabe:</p>
            <p className="text-amber-800">{proposal.required_materials}</p>
          </div>
        </div>
      )}

      {/* Didaktischer Hinweis */}
      {proposal.didaktischer_hinweis && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <p className="font-semibold text-slate-900 mb-0.5">Didaktischer Hinweis (nur für dich):</p>
            <p>{proposal.didaktischer_hinweis}</p>
          </div>
        </div>
      )}
    </div>
  );
}