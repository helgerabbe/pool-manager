import React from 'react';
import { CI_GRUND, CI_FOLIENTYPEN } from '@/lib/folienCI';
import StandardFolieAnsicht from './StandardFolieAnsicht';
import ImpulsSetzenTafel from './standard/ImpulsSetzenTafel';

/** Leere Vorlagenfolie einer Inhaltsfunktion: nur das Symbolbild rechts oben. */
function LeereFolie({ f, ansicht }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{ansicht === 'schueler' ? 'Schüler (Tablet)' : 'Lehrkraft (Tafel)'}</p>
      <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
        <div className="pointer-events-none absolute -right-[12.5%] -top-[27.8%] aspect-square w-[47%] rounded-full" style={{ background: CI_FOLIENTYPEN.inhalt.farbe }} />
        <img src={f.symbol} alt={f.name} className="absolute right-[3%] top-[4%] h-[22%] object-contain mix-blend-multiply" />
        {f.key === 'f_material'
          ? <ImpulsSetzenTafel />
          : <p className="absolute inset-0 flex items-center justify-center text-sm text-[#9AA1AE]">Noch leer</p>}
      </div>
    </div>
  );
}

export default function InhaltsFunktionAnsicht({ f }) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
      <div className="flex items-center gap-3">
        <img src={f.symbol} alt="" className="h-12 w-12 rounded-full object-contain ring-1 ring-border" />
        <div><p className="font-display text-lg font-bold">{f.name}</p><p className="text-sm text-muted-foreground">Inhaltsfolie nach Funktion · {f.text}</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StandardFolieAnsicht s={{ folientyp: 'inhalt' }} ansicht="schueler" />
        <LeereFolie f={f} ansicht="lehrer" />
      </div>
    </div>
  );
}