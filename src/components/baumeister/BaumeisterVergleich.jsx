import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import BaumeisterAnsicht from './BaumeisterAnsicht';

const leseScroll = (el) => (el?.tagName === 'IFRAME' ? el.contentWindow?.scrollY || 0 : el?.scrollTop || 0);
const setzeScroll = (el, y) => {
  if (!el) return;
  if (el.tagName === 'IFRAME') el.contentWindow?.scrollTo(0, y);
  else el.scrollTop = y;
};

/**
 * Umschalter Alt ↔ Neu. Beide Fassungen bleiben gemountet (übereinander);
 * beim Umschalten wird die Scrollposition übertragen, damit dieselbe Stelle
 * sichtbar bleibt.
 */
export default function BaumeisterVergleich({ art, alt, neu, aenderung, formSchema }) {
  const [ansicht, setAnsicht] = useState('neu');
  const refs = { alt: useRef(null), neu: useRef(null) };

  const wechsle = (ziel) => {
    if (ziel === ansicht) return;
    const y = leseScroll(refs[ansicht].current);
    setAnsicht(ziel);
    requestAnimationFrame(() => setzeScroll(refs[ziel].current, y));
  };

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted">
          {['alt', 'neu'].map((k) => (
            <button
              key={k}
              onClick={() => wechsle(k)}
              className={cn(
                'px-4 py-1 text-xs font-semibold rounded-md transition-colors',
                ansicht === k ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'
              )}
            >
              {k === 'alt' ? 'Vorher' : 'Nachher'}
            </button>
          ))}
        </div>
      </div>
      {aenderung && (
        <div className="text-xs rounded-md bg-accent/10 border border-accent/40 px-3 py-2">
          <span className="font-semibold">Geändert: </span>{aenderung}
        </div>
      )}
      <div className="relative flex-1 min-h-[45vh] rounded-lg border border-border overflow-hidden">
        {['alt', 'neu'].map((k) => (
          <BaumeisterAnsicht
            key={k}
            ref={refs[k]}
            art={art}
            inhalt={k === 'alt' ? alt : neu}
            vergleich={k === 'alt' ? neu : alt}
            formSchema={formSchema}
            className={cn('absolute inset-0', ansicht === k ? 'visible' : 'invisible')}
          />
        ))}
      </div>
    </div>
  );
}