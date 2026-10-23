import React from 'react';
import ElementInhalt from '@/components/foliendesigner/ElementInhalt';
import { FOLIE_B, FOLIE_H } from '@/lib/kiFoliensatz';
import { CI_GRUND, CI_FOLIENTYPEN } from '@/lib/folienCI';

/** Statische Vorschau einer Folie im gestalteten Look (Off-White + Folientyp-Ecke), skaliert auf die Breite. */
export default function FolieVorschau({ elemente, klein, folientyp }) {
  const ref = React.useRef(null);
  const [faktor, setFaktor] = React.useState(1);
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setFaktor(e.contentRect.width / FOLIE_B));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const typ = CI_FOLIENTYPEN[folientyp];
  return (
    <div ref={ref} className={`relative aspect-video w-full overflow-hidden ring-1 ring-border ${klein ? 'rounded-md' : 'rounded-xl shadow-lg'}`} style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      {typ && <div className="pointer-events-none absolute -right-[8%] -top-[14%] aspect-square w-[24%] rounded-full" style={{ background: typ.farbe }} />}
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: FOLIE_B, height: FOLIE_H, transform: `scale(${faktor})` }}>
        {(elemente || []).map((el) => (
          <div key={el.id} className="absolute flex items-center justify-center" style={{ left: el.x, top: el.y, width: el.b, height: el.h }}>
            <ElementInhalt el={el} />
          </div>
        ))}
      </div>
    </div>
  );
}