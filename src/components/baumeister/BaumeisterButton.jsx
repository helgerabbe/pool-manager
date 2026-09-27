import React, { useState } from 'react';
import { HardHat } from 'lucide-react';
import BaumeisterDialog from './BaumeisterDialog';

export default function BaumeisterButton({ einheitId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Baumeister: Änderung an einer Aufgabe in Worten beschreiben"
        className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-accent/50 bg-accent/10 text-foreground hover:bg-accent/20 transition-colors"
      >
        <HardHat className="w-3.5 h-3.5" />
        Baumeister
      </button>
      <BaumeisterDialog open={open} onOpenChange={setOpen} einheitId={einheitId} />
    </>
  );
}