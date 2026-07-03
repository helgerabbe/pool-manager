/**
 * ProblemMeldenButton.jsx
 *
 * Icon-Button für die globale Top-Bar: öffnet den ProblemMeldenDialog.
 * Bekommt optional die aktive Einheit als Kontext übergeben.
 */

import React, { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import NavigationTooltip from '@/components/layout/NavigationTooltip';
import ProblemMeldenDialog from '@/components/support/ProblemMeldenDialog';

export default function ProblemMeldenButton({ einheit = null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NavigationTooltip label="Problem melden">
        <button
          aria-label="Problem melden"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <LifeBuoy className="w-4 h-4" />
        </button>
      </NavigationTooltip>
      <ProblemMeldenDialog open={open} onOpenChange={setOpen} einheit={einheit} />
    </>
  );
}