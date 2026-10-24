import React from 'react';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SkaliertBox from './SkaliertBox';

/** Miniatur der Tafel (nur Überblick); Klick öffnet die große, bedienbare Ansicht. */
export default function TafelVorschau({ titel = 'Lehrkraft (Tafel)', scroll, children }) {
  const [offen, setOffen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOffen(true)} title="Groß anzeigen" className="group relative block w-full text-left">
        <div className="pointer-events-none"><SkaliertBox scroll={scroll}>{children}</SkaliertBox></div>
        <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-[#2A4074] shadow-sm group-hover:bg-white">
          <Maximize2 className="h-3 w-3" />Vergrößern
        </span>
      </button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-[min(95vw,1400px)] p-4">
          <DialogTitle className="text-sm">{titel}</DialogTitle>
          <div className={`relative rounded-lg border bg-[#FAF8F4] ${scroll ? 'max-h-[80vh] overflow-y-auto' : 'overflow-hidden'}`}>
            <div className="absolute right-0 top-0 aspect-square w-[22%] rounded-bl-full bg-[#DCE7F5]" />
            <SkaliertBox scroll={scroll}>{children}</SkaliertBox>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}