import React from 'react';
import { Button } from '@/components/ui/button';
import { PartyPopper, RotateCcw } from 'lucide-react';

/** Abschlussseite der digitalen Unterrichtsstunde. */
export default function StundenAbschlussSeite({ stunde, onNeustart }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mb-4">
        <PartyPopper className="w-7 h-7" />
      </span>
      <h2 className="text-xl font-bold text-foreground">Fertig!</h2>
      <p className="text-sm text-muted-foreground mt-2">
        Du hast alle Schritte der Stunde „{stunde.arbeitstitel}“ bearbeitet.
      </p>
      <Button variant="outline" className="mt-6 gap-2" onClick={onNeustart}>
        <RotateCcw className="w-4 h-4" /> Von vorn ansehen
      </Button>
    </div>
  );
}