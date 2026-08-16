import React from 'react';
import { Clock, AlertTriangle, Info } from 'lucide-react';
import StundenPhaseSortierButtons from './StundenPhaseSortierButtons';
import { phasenTypMeta, istDigitalerTyp, istBrianTyp, istBrianVollstaendig } from '@/lib/stundenPhasen';
import StundenPhaseEditForm from './StundenPhaseEditForm';
import PhaseRegieText from './PhaseRegieText';
import StundenPhaseArtZeile from './StundenPhaseArtZeile';
import StundenPhaseSteuerspalte from './StundenPhaseSteuerspalte';

/**
 * Eine Zeile des Stunden-Regieblatts (Lese-Ansicht, MUG Paket 2).
 * Kompakte Zweiteilung (2026-08-16): der Inhalt steht links/unten,
 * die strukturellen Elemente liegen als schmale Leiste oben rechts.
 * Ziel: möglichst viele Phasen auf einer Bildschirmseite.
 */
export default function StundenPhaseCard({ phase, nummer, anzahl, stunde, stundeId, offen, onToggle }) {
  const meta = phasenTypMeta(phase.typ);
  const diff = phase.differenzierung || {};
  const aktivitaetFehlt = istDigitalerTyp(phase.typ) && !phase.aktivitaet_id;
  const inhaltFehlt =
    istDigitalerTyp(phase.typ) &&
    !!phase.aktivitaet_id &&
    Object.keys(phase.field_values || {}).length === 0;
  const brianFehlt = istBrianTyp(phase.typ) && !istBrianVollstaendig(phase.brian);
  const unvollstaendig = aktivitaetFehlt || inhaltFehlt || brianFehlt;
  // Reiner Hinweis (blockiert die Vollständigkeit NICHT): analoge Phase ohne Material.
  const materialHinweis =
    !istDigitalerTyp(phase.typ) &&
    !istBrianTyp(phase.typ) &&
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
      className={`group rounded-lg border bg-card px-3 py-2 ${meta.rand} ${onToggle ? 'cursor-pointer' : ''}`}
    >
      {/* Kopfzeile: links Art/Titel/Dauer, rechts die Struktur-Leiste */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
            {nummer}
          </span>
          <StundenPhaseArtZeile phase={phase} />
          {phase.dauer_minuten ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {phase.dauer_minuten} Min.
            </span>
          ) : null}
        </div>

        <StundenPhaseSteuerspalte
          phase={phase}
          unvollstaendig={unvollstaendig}
          stundeId={stundeId}
          offen={offen}
          onToggle={onToggle}
        />
      </div>

      {/* Inhalt */}
      <div className="pl-7 pr-2 space-y-1">
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
          <div className="grid gap-1 sm:grid-cols-3 text-xs text-muted-foreground">
            {diff.standard && <p><span className="font-medium">Standard:</span> {diff.standard}</p>}
            {diff.stark && <p><span className="font-medium">★★ Stark:</span> {diff.stark}</p>}
            {diff.foerderung && <p><span className="font-medium">Förderung:</span> {diff.foerderung}</p>}
          </div>
        )}
      </div>

      {/* Sortieren/Löschen: erscheinen erst beim Überfahren, unten rechts */}
      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <StundenPhaseSortierButtons phase={phase} index={nummer - 1} anzahl={anzahl} stundeId={stundeId} />
      </div>

      {offen && (
        <div
          data-arbeitsbereich
          onClick={(e) => e.stopPropagation()}
          className="ml-4 sm:ml-7 mt-3 rounded-lg border border-amber-300 bg-amber-50/70 border-l-4 border-l-amber-400 p-4 cursor-default"
        >
          <StundenPhaseEditForm phase={phase} stunde={stunde} stundeId={stundeId} onFertig={onToggle} />
        </div>
      )}
    </div>
  );
}