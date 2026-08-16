import React from 'react';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Clock, Pencil, Paperclip, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { phasenTypMeta, istDigitalerTyp } from '@/lib/stundenPhasen';
import StundenPhaseEditForm from './StundenPhaseEditForm';

/**
 * Eine Zeile des Stunden-Regieblatts (Lese-Ansicht, MUG Paket 2).
 */
export default function StundenPhaseCard({ phase, nummer, stundeId, offen, onToggle }) {
  const meta = phasenTypMeta(phase.typ);
  const diff = phase.differenzierung || {};
  const materialien = phase.material_urls || [];
  const aktivitaetFehlt = istDigitalerTyp(phase.typ) && !phase.aktivitaet_id;

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
        <div className="ml-auto flex items-center gap-2">
          {phase.freischalt_code && (
            <Badge className="font-mono gap-1">
              <KeyRound className="w-3 h-3" />
              {phase.freischalt_code}
            </Badge>
          )}
          {onToggle && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onToggle}>
              {offen ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Zuklappen</>
              ) : (
                <><Pencil className="w-3.5 h-3.5" /> Bearbeiten <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </Button>
          )}
        </div>
      </div>

      {aktivitaetFehlt && (
        <p className="text-xs text-amber-700 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Noch keine digitale Aufgabenart verknüpft.
        </p>
      )}

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
      {materialien.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          {materialien.map((m, i) => (
            <a
              key={`${m.url}-${i}`}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              {m.name || 'Material'}
            </a>
          ))}
        </div>
      )}

      {offen && (
        <div className="ml-4 sm:ml-8 mt-3 rounded-lg border border-amber-300 bg-amber-50/70 border-l-4 border-l-amber-400 p-4">
          <p className="text-xs font-semibold text-amber-900 mb-3 uppercase tracking-wide">
            Arbeitsbereich · Phase {nummer} bearbeiten
          </p>
          <StundenPhaseEditForm phase={phase} stundeId={stundeId} onFertig={onToggle} />
        </div>
      )}
    </div>
  );
}