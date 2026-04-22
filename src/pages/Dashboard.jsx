import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { TutorialSlideshowDialog } from '@/components/onboarding/TutorialSlideshow';

export default function Dashboard() {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl overflow-hidden shadow-md w-full">
        <img
          src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/996944c1f_image.png"
          alt="Pool-Manager – Die Orga-App für Freiarbeitszeiten"
          className="w-full h-full object-cover"
          style={{ maxHeight: '480px' }}
        />
      </div>

      {/* Dezenter Tutorial-Neustart-Button */}
      <button
        onClick={() => setTutorialOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <GraduationCap className="w-3.5 h-3.5" />
        </div>
        Onboarding-Tutorial erneut ansehen
      </button>

      {tutorialOpen && (
        <TutorialSlideshowDialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      )}
    </div>
  );
}