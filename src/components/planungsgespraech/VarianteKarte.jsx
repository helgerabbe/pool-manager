import React from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';

/** Eine Möglichkeit, wie die Stunde laufen kann – auf Wunsch mit einfachem Verlauf. */
export default function VarianteKarte({ option, gewaehlt, onWaehlen }) {
  const [zeigen, setZeigen] = React.useState(false);
  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${gewaehlt ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <button onClick={onWaehlen} className="flex w-full items-start gap-3 text-left">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${gewaehlt ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
          {gewaehlt && <Check className="h-3 w-3" />}
        </span>
        <span>
          <span className="block font-semibold">{option.titel}</span>
          <span className="block text-sm text-muted-foreground">{option.kurz}</span>
        </span>
      </button>
      <button onClick={() => setZeigen(!zeigen)} className="ml-8 mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        {zeigen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {zeigen ? 'Verlauf ausblenden' : 'Zeig mir, wie das aussieht'}
      </button>
      {zeigen && (
        <ol className="ml-8 mt-2 space-y-1">
          {(option.verlauf || []).map((p, i) => (
            <li key={i} className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${p.extra ? 'bg-accent/15 font-medium text-foreground' : 'bg-muted/60'}`}>
              <span>{i + 1}. {p.name}{p.extra && <span className="ml-2 text-xs text-accent">kommt dazu</span>}</span>
              {p.minuten ? <span className="text-xs text-muted-foreground">{p.minuten} Min.</span> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}