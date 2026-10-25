import React, { useState } from 'react';
import { Ear, VolumeX, NotebookPen } from 'lucide-react';
import { CI_SYMBOL_STIL } from '@/lib/folienCI';
import StoppHinweis from './StoppHinweis';

const gross = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Zuhör-Folie: Ohr + Stille-Zeichen, optional ein Notizfeld für Fragen und Stichworte. */
export default function ZuhoerenBild({ ansicht }) {
  if (ansicht === 'lehrer') return <p className="text-xs">(Inhalt der Lehrkraft an der Tafel)</p>;
  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs">
      <div className="flex gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><Ear className="h-6 w-6" /></span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><VolumeX className="h-6 w-6" /></span>
      </div>
      <p>Deine Lehrkraft erklärt dir jetzt etwas.<br />Sei leise, hör zu und stör die anderen nicht.</p>
      <StoppHinweis />
    </div>
  );
}