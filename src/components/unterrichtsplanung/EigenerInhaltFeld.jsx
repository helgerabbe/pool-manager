import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/** „Was noch mit rein soll“: eigenes Thema als Muss-Inhalt in die Liste aufnehmen. */
export default function EigenerInhaltFeld({ onAufnehmen, laeuft }) {
  const [text, setText] = useState('');
  const aufnehmen = () => { onAufnehmen(text.trim()); setText(''); };
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Was noch mit rein soll</span>
        <SpeechInputButton value={text} onResult={setText} maxSeconds={60} label="Spracheingabe" />
      </div>
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Konjunktionen für die Verknüpfung von Argumenten" />
      <Button variant="outline" size="sm" onClick={aufnehmen} disabled={laeuft || !text.trim()} className="gap-2">
        <Plus className="h-4 w-4" /> Thema in die Liste aufnehmen
      </Button>
    </div>
  );
}