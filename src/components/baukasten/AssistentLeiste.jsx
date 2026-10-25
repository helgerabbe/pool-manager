import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Send } from 'lucide-react';

/** Assistent: ganzen Ablauf vorschlagen oder gezielt nach Bausteinen fragen. */
export default function AssistentLeiste({ laedt, leer, onVorschlag }) {
  const [wunsch, setWunsch] = React.useState('');
  const senden = () => { if (!wunsch.trim()) return; onVorschlag(wunsch.trim()); setWunsch(''); };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-gradient-to-r from-primary/5 to-accent/5 p-3">
      <Sparkles className="h-4 w-4 text-accent" />
      <Button size="sm" variant={leer ? 'default' : 'outline'} disabled={laedt} onClick={() => onVorschlag('')}>
        {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Ganzen Ablauf vorschlagen
      </Button>
      <div className="flex min-w-[260px] flex-1 items-center gap-2">
        <Input value={wunsch} onChange={(e) => setWunsch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && senden()} disabled={laedt}
          placeholder="z. B. Hast du eine Methode für einen motivierenden Einstieg?" className="h-8 bg-card text-sm" />
        <Button size="sm" variant="ghost" disabled={laedt || !wunsch.trim()} onClick={senden}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}