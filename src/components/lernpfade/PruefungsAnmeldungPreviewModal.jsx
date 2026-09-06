/**
 * PruefungsAnmeldungPreviewModal.jsx
 *
 * Lehrer-Vorschau des Standard-Elements „Anmeldung zur schriftlichen Arbeit"
 * (sys_exam_register). Zeigt im iPad-Rahmen exakt die Seite, die Schüler im
 * Arbeitsplan sehen. Reine Vorschau — es wird nichts gespeichert.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import PruefungsAnmeldungSeite from '@/components/schueler/pfad/PruefungsAnmeldungSeite';

export default function PruefungsAnmeldungPreviewModal({ open, onOpenChange, einheitTitel }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Vorschau: Anmeldung zur schriftlichen Arbeit
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Die Schüler tragen ihren Termin in der Poolzeit-App ein und müssen
            hier das Datum der Arbeit eingeben — bestätigen allein genügt nicht.
            In dieser Vorschau wird nichts gespeichert.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <IPadFrame
            lernpaketTitel={einheitTitel || 'Einheit'}
            phaseLabel="Anmeldung"
            scale={0.72}
          >
            <PruefungsAnmeldungSeite demo meta={{ titel: 'Anmeldung zur schriftlichen Arbeit' }} />
          </IPadFrame>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}