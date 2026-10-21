import React from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import VorgabenListe from '@/components/grobplanung/VorgabenListe';

/** Aktueller Stand „Darauf achte ich“ als Pop-up: passt → Stunde bauen, sonst zurück ins Gespräch. */
export default function VorgabenPopup({ offen, onSchliessen, punkte, setPunkte, laedt, onBauen }) {
  return (
    <Dialog open={offen} onOpenChange={(o) => !o && onSchliessen()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Darauf würde ich jetzt achten</DialogTitle>
          <DialogDescription>Das habe ich bisher herausgehört. Passt das, oder hast du noch was?</DialogDescription>
        </DialogHeader>
        {laedt && !punkte.length ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich fasse zusammen …</p>
          : <VorgabenListe punkte={punkte} setPunkte={setPunkte} laedt={laedt} onBauen={onBauen} />}
        <Button variant="ghost" onClick={onSchliessen}>Moment, ich habe noch was</Button>
      </DialogContent>
    </Dialog>
  );
}