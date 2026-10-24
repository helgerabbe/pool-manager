import React from 'react';

/** Rendert den Inhalt in fester Designgröße und skaliert ihn auf die verfügbare Breite. */
export default function SkaliertBox({ breite = 900, hoehe = 450, children }) {
  const ref = React.useRef(null);
  const [faktor, setFaktor] = React.useState(1);
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setFaktor(e.contentRect.width / breite));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [breite]);
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: hoehe * faktor }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: breite, height: hoehe, transform: `scale(${faktor})` }}>{children}</div>
    </div>
  );
}