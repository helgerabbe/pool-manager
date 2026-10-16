import React from 'react';
import { Repeat, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Festes Ritual direkt an der Stunde: kleiner Knopf, der zu einem eigenen Baustein wird. */
export default function RitualBaustein({ routine, setRoutine }) {
  const [offen, setOffen] = React.useState(!!routine.trim());
  if (!offen) {
    return (
      <button onClick={() => setOffen(true)} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed p-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
        <Plus className="h-3.5 w-3.5" /> Mein Ritual einfügen
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <Repeat className="h-4 w-4 shrink-0 text-primary" />
      <Input autoFocus value={routine} onChange={(ev) => setRoutine(ev.target.value)} placeholder="Mein Ritual, z. B. Begrüßung und Wochenplan-Check, 3 Min." className="h-8 bg-card" />
      <button onClick={() => { setRoutine(''); setOffen(false); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}