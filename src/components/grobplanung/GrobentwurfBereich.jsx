import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhaseKarte from './GrobPhaseKarte';
import KiAenderungsFeld from '@/components/stundenplanerPrototyp/KiAenderungsFeld';

/** Ergebnis der Grobplanung: Verlauf, gezielte Überarbeitung per Sprache, Übernahme in die nächste Phase. */
export default function GrobentwurfBereich({ entwurf, onAendern, onWeiter }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dein Grobentwurf</p>
        <p className="text-sm font-semibold">{entwurf.kurz}</p>
        {entwurf.hinweis && <p className="text-xs text-accent">{entwurf.hinweis}</p>}
      </div>
      <div className="space-y-2">
        {entwurf.phasen.map((p, i) => <GrobPhaseKarte key={i} phase={p} nr={i + 1} />)}
      </div>
      <KiAenderungsFeld onAendern={onAendern} />
      <div className="rounded-xl bg-muted/40 p-4">
        <p className="mb-2 text-sm">Ist das so in Ordnung? Dann geht es mit diesem Entwurf in die nächste Planungsphase.</p>
        <Button onClick={onWeiter}>Mit diesem Entwurf weiterarbeiten <ArrowRight /></Button>
      </div>
    </div>
  );
}