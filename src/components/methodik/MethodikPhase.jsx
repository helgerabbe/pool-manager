import React from 'react';
import { Pencil, MessageCircle, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhaseKarte from '@/components/grobplanung/GrobPhaseKarte';
import { FREIE_METHODE, istFreieMethode } from '@/lib/freieMethode';

import ZeitWahl from './ZeitWahl';

/** Eine Phase der methodischen Gestaltung. Unter „Mehr dazu“: Hintergrund und Startknöpfe für den Assistenten. */
export default function MethodikPhase({ phase, nr, onStart, onZeit }) {
  const aufgabe = ['kern', 'teil'].includes(phase.aufgabe_art) && (
    <div className="mb-1 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm">
      <Target className="h-4 w-4 shrink-0 text-accent" />
      <span><b>Übungsphase:</b> Die Schüler bearbeiten {phase.aufgabe_art === 'kern' ? 'die Kernaufgabe' : 'die Teilaufgabe'} {phase.aufgabe_titel ? `„${phase.aufgabe_titel}“` : ''}{phase.aufgabe_art === 'kern' ? ' (mit Differenzierung)' : ''}.</span>
    </div>
  );
  return (
    <div>{aufgabe}
    <GrobPhaseKarte phase={istFreieMethode(phase) ? { ...phase, methode: FREIE_METHODE } : phase} nr={nr} zeit={<ZeitWahl phase={phase} onSpeichern={onZeit} />}>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onStart('aendern')}><Pencil /> Hier möchte ich etwas ändern</Button>
        <Button size="sm" variant="outline" onClick={() => onStart('frage')}><MessageCircle /> Ich habe eine Frage dazu</Button>
        <Button size="sm" variant="outline" onClick={() => onStart('alternativen')}><Lightbulb /> Welche Alternativen gibt es?</Button>
      </div>
    </GrobPhaseKarte>
    </div>
  );
}