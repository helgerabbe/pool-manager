import React from 'react';
import { Pencil, MessageCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhaseKarte from '@/components/grobplanung/GrobPhaseKarte';

const zeitKategorie = (m = 0) => (m <= 5 ? 'kurz' : m <= 10 ? 'normal' : m <= 20 ? 'lang' : 'sehr lang');

/** Eine Phase der methodischen Gestaltung. Unter „Mehr dazu“: Hintergrund und Startknöpfe für den Assistenten. */
export default function MethodikPhase({ phase, nr, onStart }) {
  return (
    <GrobPhaseKarte phase={phase} nr={nr} zeit={zeitKategorie(phase.minuten)}>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onStart('aendern')}><Pencil /> Hier möchte ich etwas ändern</Button>
        <Button size="sm" variant="outline" onClick={() => onStart('frage')}><MessageCircle /> Ich habe eine Frage dazu</Button>
        <Button size="sm" variant="outline" onClick={() => onStart('alternativen')}><Lightbulb /> Welche Alternativen gibt es?</Button>
      </div>
    </GrobPhaseKarte>
  );
}