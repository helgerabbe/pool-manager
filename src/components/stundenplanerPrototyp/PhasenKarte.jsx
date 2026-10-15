import React from 'react';
import { Pencil, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/** Eine Phase des Grobentwurfs – Text per Klick bearbeitbar. */
export default function PhasenKarte({ phase, onAendern }) {
  const [bearbeiten, setBearbeiten] = React.useState(false);
  const [text, setText] = React.useState(phase.aktivitaet);
  React.useEffect(() => setText(phase.aktivitaet), [phase.aktivitaet]);
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-4">
      <div className="w-16 shrink-0 text-center">
        <p className="font-display text-xl font-bold text-primary">{phase.minuten}</p>
        <p className="text-[10px] uppercase text-muted-foreground">Min.</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{phase.name} <span className="font-normal text-muted-foreground">· {phase.sozialform}</span></p>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => { if (bearbeiten) onAendern(text); setBearbeiten(!bearbeiten); }}>
            {bearbeiten ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>
        {bearbeiten ? <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} /> : <p className="text-sm text-muted-foreground">{phase.aktivitaet}</p>}
      </div>
    </div>
  );
}