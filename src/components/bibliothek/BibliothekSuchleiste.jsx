import React, { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

const sel = 'h-9 rounded-md border border-input bg-transparent px-2 text-sm';

/** Filter (Text, Fächer) und KI-Suche mit Spracheingabe. */
export default function BibliothekSuchleiste({ filter, onFilter, onKiSuche, kiLaeuft, kiAktiv, onKiReset }) {
  const [frage, setFrage] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input className="h-9 max-w-xs" placeholder="Liste filtern …" value={filter.text} onChange={(e) => onFilter({ ...filter, text: e.target.value })} />
        <select className={sel} value={filter.faecher} onChange={(e) => onFilter({ ...filter, faecher: e.target.value })}>
          <option value="meine">Nur meine Fächer</option>
          <option value="alle">Alle Fächer</option>
        </select>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            className="h-9 pr-11"
            placeholder="KI-Suche, z. B. „Alles zur antithetischen Erörterung in Klasse 9“"
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && frage.trim() && onKiSuche(frage)}
          />
          <SpeechInputButton value={frage} onResult={setFrage} maxSeconds={30} className="absolute right-1 top-0.5" />
        </div>
        <Button size="sm" className="h-9 gap-2" disabled={!frage.trim() || kiLaeuft} onClick={() => onKiSuche(frage)}>
          {kiLaeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Suchen
        </Button>
        {kiAktiv && (
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => { setFrage(''); onKiReset(); }}>
            <X className="h-4 w-4" /> Alle zeigen
          </Button>
        )}
      </div>
    </div>
  );
}