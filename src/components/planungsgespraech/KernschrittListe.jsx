import React from 'react';
import { ChevronDown, Check, MessageCircle } from 'lucide-react';

/** Grober Stundenverlauf (4–6 Kernschritte), einklappbar. Je Schritt: „Passt so“ (grün) oder „Darüber sprechen“. */
export default function KernschrittListe({ schritte, onAnsprechen, onOk, gesperrt }) {
  const [offen, setOffen] = React.useState(true);
  const liste = schritte || [];
  const ok = liste.filter((s) => s.ok).length;
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOffen(!offen)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="font-display text-sm font-bold">Grober Stundenverlauf</span>
        <span className="text-xs text-muted-foreground">{liste.length ? `${ok} von ${liste.length} Schritten passen` : 'entsteht im Gespräch'}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && liste.length > 0 && (
        <div className="grid gap-2 border-t p-3 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((s, i) => (
            <div key={i} className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 ${s.ok ? 'border-chart-3 bg-chart-3/10' : 'bg-background'}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground ${s.ok ? 'bg-chart-3' : 'bg-primary'}`}>{i + 1}</span>
                <p className="min-w-0 flex-1 text-xs leading-snug"><span className="font-semibold">{s.name}: </span><span className="text-muted-foreground">{s.satz}</span>
                  {s.neu && !s.ok && <span className="ml-1 font-semibold text-accent">(geändert)</span>}</p>
              </div>
              <div className="flex justify-end gap-1">
                <button disabled={gesperrt} onClick={() => onOk(i)} className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium disabled:opacity-50 ${s.ok ? 'bg-chart-3 text-primary-foreground' : 'border hover:border-chart-3 hover:text-chart-3'}`}><Check className="h-3 w-3" /> Passt so</button>
                <button disabled={gesperrt} onClick={() => onAnsprechen(s)} className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium hover:border-primary hover:text-primary disabled:opacity-50"><MessageCircle className="h-3 w-3" /> Darüber sprechen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}