import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, SkipForward } from 'lucide-react';
import DidaktikCoachChat from '@/components/ai/DidaktikCoachChat';

export default function WizardStep2Coach({ onDone, onSkip }) {
  const [capturedText, setCapturedText] = useState('');

  const handleUebernehmen = (text) => {
    setCapturedText(text);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Schritt 2: Didaktik-Coach</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Nutzen Sie den KI-Coach, um Ihre Unterrichtsideen in eine Lernstruktur zu übersetzen.
          Wenn der Coach einen Strukturentwurf ausgibt, erscheint ein "Übernehmen"-Button.
        </p>
      </div>

      <DidaktikCoachChat
        onBraindumpUebernehmen={(text) => handleUebernehmen(text)}
      />

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onSkip} className="gap-2 text-muted-foreground">
          <SkipForward className="w-4 h-4" />
          Überspringen
        </Button>
        <Button
          onClick={() => onDone(capturedText)}
          disabled={!capturedText}
          className="gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Weiter: Lernpakete anlegen
          {capturedText && <span className="ml-1 text-xs opacity-75">(Entwurf übernommen)</span>}
        </Button>
      </div>
    </div>
  );
}