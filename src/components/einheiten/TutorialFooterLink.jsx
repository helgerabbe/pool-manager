import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { TutorialSlideshowDialog } from '@/components/onboarding/TutorialSlideshow';

/**
 * Dezenter Link am Ende der Einheiten-Seite, um das Onboarding-Tutorial
 * jederzeit erneut anzusehen (ersetzt die frühere Dashboard-Seite).
 */
export default function TutorialFooterLink() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-6 mt-2 border-t border-border">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <GraduationCap className="w-3.5 h-3.5" />
        </div>
        Onboarding-Tutorial erneut ansehen
      </button>
      {open && <TutorialSlideshowDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}