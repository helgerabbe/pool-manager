import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

/**
 * Kleiner Knopf, der eine Anleitung erst auf Wunsch zeigt.
 *
 * Die Wege nach Moodle sind wichtig, aber man liest sie einmal — dauerhaft
 * aufgeklappt machen sie die Übersicht unruhig. Deshalb sitzt die Anleitung
 * hier hinter einem Dialog neben der Hauptaktion.
 */
export default function AnleitungDialogButton({ titel, children }) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOffen(true)} className="gap-2 shrink-0">
        <HelpCircle className="w-4 h-4" />
        Anleitung
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titel}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}