import React from 'react';
import { User, Users, UsersRound, Presentation, BookOpen, PenLine, MessageCircle, Ear, Eye, Brain, Hand, Pencil, Calculator, Search, Tablet, Notebook } from 'lucide-react';
import { CI_GRUND, CI_SYMBOL_STIL, CI_SOZIALFORM, CI_TAETIGKEIT } from '@/lib/folienCI';

const ICONS = { User, Users, UsersRound, Presentation, BookOpen, PenLine, MessageCircle, Ear, Eye, Brain, Hand, Pencil, Calculator, Search, Tablet, Notebook };

function Gruppe({ titel, eintraege }) {
  const s = CI_SYMBOL_STIL;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{titel}</p>
      <div className="flex flex-wrap gap-4">
        {Object.entries(eintraege).map(([k, e]) => {
          const Icon = ICONS[e.symbol];
          return (
            <div key={k} className="flex w-20 flex-col items-center gap-1 text-center text-xs">
              <span className="flex items-center justify-center rounded-full" style={{ background: s.hg, color: s.farbe, width: s.groesse, height: s.groesse }}><Icon className="h-5 w-5" /></span>
              {e.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Vorschau Teil 6: Symbole für Sozialform und Tätigkeit. */
export default function CiSymbolVorschau() {
  return (
    <div className="space-y-4 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <Gruppe titel="Sozialform (Ecke rechts oben)" eintraege={CI_SOZIALFORM} />
      <Gruppe titel="Tätigkeit (neben dem Arbeitsauftrag)" eintraege={CI_TAETIGKEIT} />
      <p className="text-xs text-muted-foreground">Höchstens ein Sozialform- und zwei Tätigkeitssymbole je Folie.</p>
    </div>
  );
}