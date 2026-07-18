import React, { useState } from 'react';
import { GraduationCap, PlayCircle } from 'lucide-react';
import { TutorialSlideshowDialog } from '@/components/onboarding/TutorialSlideshow';

/**
 * Infokasten oben in der Dokumentation: Onboarding-Tutorial jederzeit
 * erneut ansehen (ersetzt den früheren Link auf der Startseite).
 */
export default function TutorialInfoBox() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <GraduationCap className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold text-foreground">Neu hier — oder kurze Auffrischung gefällig?</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Das Onboarding-Tutorial führt Sie in wenigen Minuten durch die wichtigsten Funktionen des Pool-Managers.
        </p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
      >
        <PlayCircle className="w-4 h-4" />
        Tutorial ansehen
      </button>
      {open && <TutorialSlideshowDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}