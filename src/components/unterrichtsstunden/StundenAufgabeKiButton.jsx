/**
 * Zweiter Weg zur digitalen Aufgabe: „Von KI erstellen lassen".
 * Steht als Button neben „Aufgabe bearbeiten" — die Lehrkraft entscheidet
 * bewusst, ob sie selbst ausarbeitet oder die KI beauftragt. Der KI-Dialog
 * wird erst auf Klick geöffnet.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import StundenAufgabeKiGenerator from '@/components/unterrichtsstunden/StundenAufgabeKiGenerator';

export default function StundenAufgabeKiButton({ phase, katalogEntry, stundeId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => setOpen(true)}>
        <Sparkles className="w-3.5 h-3.5" />
        Von KI erstellen lassen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Aufgabe „{katalogEntry?.name}" von der KI erstellen lassen
            </DialogTitle>
          </DialogHeader>
          <StundenAufgabeKiGenerator
            phase={phase}
            katalogEntry={katalogEntry}
            stundeId={stundeId}
            onFertig={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}