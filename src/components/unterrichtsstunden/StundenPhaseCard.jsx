import React from 'react';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Clock } from 'lucide-react';
import { phasenTypMeta } from '@/lib/stundenPhasen';

/**
 * Eine Zeile des Stunden-Regieblatts (Lese-Ansicht, MUG Paket 2).
 */
export default function StundenPhaseCard({ phase, nummer }) {
  const meta = phasenTypMeta(phase.typ);
  const diff = phase.differenzierung || {};

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {nummer}
        </span>
        <h3 className="text-sm font-bold text-foreground">{phase.phasenname || 'Phase'}</h3>
        <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
        {phase.dauer_minuten ? (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {phase.dauer_minuten} Min.
          </span>
        ) : null}
        {phase.freischalt_code && (
          <Badge className="ml-auto font-mono gap-1">
            <KeyRound className="w-3 h-3" />
            {phase.freischalt_code}
          </Badge>
        )}
      </div>

      {phase.lehrer_hinweis && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Regie: </span>
          {phase.lehrer_hinweis}
        </p>
      )}
      {phase.schueler_anweisung && (
        <p className="text-sm text-foreground">
          <span className="font-medium text-muted-foreground">Für Schüler:innen: </span>
          {phase.schueler_anweisung}
        </p>
      )}
      {(diff.standard || diff.stark || diff.foerderung) && (
        <div className="grid gap-1 sm:grid-cols-3 pt-1 text-xs text-muted-foreground">
          {diff.standard && <p><span className="font-medium">Standard:</span> {diff.standard}</p>}
          {diff.stark && <p><span className="font-medium">★★ Stark:</span> {diff.stark}</p>}
          {diff.foerderung && <p><span className="font-medium">Förderung:</span> {diff.foerderung}</p>}
        </div>
      )}
    </div>
  );
}