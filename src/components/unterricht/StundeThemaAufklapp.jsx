import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Klappt das ausführliche Thema einer Stunde unter ihrem Titel auf. */
export default function StundeThemaAufklapp({ thema }) {
  const [offen, setOffen] = useState(false);
  if (!thema) return null;
  return (
    <div className="px-10 pb-2 -mt-1">
      <button type="button" onClick={() => setOffen(!offen)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
        <ChevronDown className={`w-3 h-3 transition-transform ${offen ? 'rotate-180' : ''}`} /> Thema der Stunde
      </button>
      {offen && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{thema}</p>}
    </div>
  );
}