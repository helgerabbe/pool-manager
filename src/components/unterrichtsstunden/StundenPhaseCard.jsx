import React from 'react';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Clock, Pencil, AlertTriangle, ChevronDown, ChevronUp, Users, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { phasenTypMeta, istDigitalerTyp } from '@/lib/stundenPhasen';
import StundenPhaseEditForm from './StundenPhaseEditForm';
import PhaseRegieText from './PhaseRegieText';

/**
 * Eine Zeile des Stunden-Regieblatts (Lese-Ansicht, MUG Paket 2).
 */
export default function StundenPhaseCard({ phase, nummer, stundeId, offen, onToggle }) {
  const meta = phasenTypMeta(phase.typ);
  const diff = phase.differenzierung || {};
  const aktivitaetFehlt = istDigitalerTyp(phase.typ) && !phase.aktivitaet_id;
  const inhaltFehlt =
    istDigitalerTyp(phase.typ) &&
    !!phase.aktivitaet_id &&
    Object.keys(phase.field_values || {}).length === 0;
  const unvollstaendig = aktivitaetFehlt || inhaltFehlt;
  // Reiner Hinweis (blockiert die Vollständigkeit NICHT): analoge Phase ohne Material.
  const materialHinweis =
    !istDigitalerTyp(phase.typ) &&
    (phase.material_urls || []).length === 0 &&
    !phase.material_hinweis;

  // Klick irgendwo auf die Karte klappt den Arbeitsbereich auf/zu –
  // Links, Buttons und der Arbeitsbereich selbst bleiben davon unberührt.
  const handleCardClick = (e) => {
    if (!onToggle) return;
    if (e.target.closest('a, button, input, textarea, select, [role="combobox"], [data-arbeitsbereich]')) return;
    onToggle();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-xl border bg-card p-4 space-y-2 ${meta.rand} ${onToggle ? 'cursor-pointer' : ''}`}
    >
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
        <p className="text-xs font-medium text-red-700 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Noch keine digitale Aufgabenart verknüpft.
        </p>
      )}
      {inhaltFehlt && (
        <p className="text-xs font-medium text-red-700 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Aufgabenart gewählt, aber die Aufgabe ist noch nicht erstellt.
        </p>
      )}
      {materialHinweis && (
        <p className="text-xs text-sky-700 inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span><span className="font-medium">Hinweis:</span> Für diese Phase ist noch kein Material hinterlegt.</span>
        </p>
      )}

      <PhaseRegieText text={phase.lehrer_hinweis} />
      {(diff.standard || diff.stark || diff.foerderung) && (
        <div className="grid gap-1 sm:grid-cols-3 pt-1 text-xs text-muted-foreground">
          {diff.standard && <p><span className="font-medium">Standard:</span> {diff.standard}</p>}
          {diff.stark && <p><span className="font-medium">★★ Stark:</span> {diff.stark}</p>}
          {diff.foerderung && <p><span className="font-medium">Förderung:</span> {diff.foerderung}</p>}
        </div>
      )}
      {phase.methode_sozialform && (
        <div className="pt-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />
            {phase.methode_sozialform}
          </span>
        </div>
      )}

      {offen && (
        <div
          data-arbeitsbereich
          onClick={(e) => e.stopPropagation()}
          className="ml-4 sm:ml-8 mt-3 rounded-lg border border-amber-300 bg-amber-50/70 border-l-4 border-l-amber-400 p-4 cursor-default"
        >
          <StundenPhaseEditForm phase={phase} stundeId={stundeId} onFertig={onToggle} />
        </div>
      )}
    </div>
  );
}