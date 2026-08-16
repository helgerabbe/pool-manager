import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Target } from 'lucide-react';

/** Einstiegsseite der digitalen Unterrichtsstunde (Titel, Ziel, „Los geht's"). */
export default function StundenStartSeite({ stunde, anzahlPhasen, onStart }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto px-6 py-10">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5">
        <Target className="w-7 h-7" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {stunde.fach} · Jahrgangsstufe {stunde.jahrgangsstufe}
      </p>
      <h1 className="text-2xl font-bold text-foreground tracking-tight mt-1">{stunde.arbeitstitel}</h1>
      {stunde.stundenziel && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{stunde.stundenziel}</p>
      )}
      <p className="text-xs text-muted-foreground mt-5">
        {anzahlPhasen} Schritte · Deine Lehrkraft schaltet jeden Schritt mit einem Code frei.
      </p>
      <Button className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onStart}>
        <Play className="w-4 h-4" /> Los geht's
      </Button>
    </div>
  );
}