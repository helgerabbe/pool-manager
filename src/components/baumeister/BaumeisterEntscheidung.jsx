import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Wand2 } from 'lucide-react';

/** Ja / Nein / Ja-mit-Hinweis unter dem Vergleich. */
export default function BaumeisterEntscheidung({ onJa, onNein, onNachbessern, jaGesperrt = false }) {
  const [zusatz, setZusatz] = useState('');
  return (
    <div className="space-y-2 shrink-0">
      <div className="flex gap-2">
        <Textarea
          value={zusatz}
          onChange={(e) => setZusatz(e.target.value)}
          placeholder="Fast — aber bitte noch … (optional)"
          className="min-h-[40px] text-sm"
        />
        <Button variant="outline" disabled={!zusatz.trim()} onClick={() => onNachbessern(zusatz.trim())}>
          <Wand2 /> Nachbessern
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onNein}><X /> Nein, verwerfen</Button>
        <Button disabled={jaGesperrt} onClick={onJa}><Check /> Ja, so übernehmen</Button>
      </div>
    </div>
  );
}