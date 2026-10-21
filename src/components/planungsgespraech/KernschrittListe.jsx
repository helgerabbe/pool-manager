import React from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';

/** Grober Stundenverlauf (4–6 Kernschritte), ein- und ausklappbar. Klick auf einen Schritt startet das Gespräch darüber. */
export default function KernschrittListe({ schritte, onAnsprechen, gesperrt }) {
  const [offen, setOffen] = React.useState(true);
  const liste = schritte || [];
  const neu = liste.some((s) => s.neu);
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOffen(!offen)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="font-display text-sm font-bold">Grober Stundenverlauf</span>
        <span className="text-xs text-muted-foreground">{liste.length ? `${liste.length} Schritte` : 'entsteht im Gespräch'}</span>
        {neu && !offen && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">geändert</span>}
        <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && liste.length > 0 && (
        <div className="grid gap-2 border-t p-3 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((s, i) => (
            <button key={i} disabled={gesperrt} onClick={() => onAnsprechen(s)} title="Darüber sprechen"
              className={`group flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left hover:border-primary disabled:opacity-60 ${s.neu ? 'border-accent bg-accent/10' : 'bg-background'}`}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 text-xs leading-snug"><span className="font-semibold">{s.name}: </span><span className="text-muted-foreground">{s.satz}</span></span>
              <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}