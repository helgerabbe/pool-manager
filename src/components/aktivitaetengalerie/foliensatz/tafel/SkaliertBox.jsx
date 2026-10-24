import React from 'react';

/** Rendert den Inhalt in fester Designgröße und skaliert ihn auf die verfügbare Breite.
 *  scroll = Inhalt darf über den Bildschirm hinaus nach unten wachsen. */
export default function SkaliertBox({ breite = 900, hoehe = 450, scroll, children }) {
  const ref = React.useRef(null);
  const innen = React.useRef(null);
  const [faktor, setFaktor] = React.useState(1);
  const [h, setH] = React.useState(hoehe);
  React.useEffect(() => {
    const ro = new ResizeObserver(([e]) => setFaktor(e.contentRect.width / breite));
    ro.observe(ref.current);
    const ri = new ResizeObserver(([e]) => setH(e.target.offsetHeight));
    ri.observe(innen.current);
    return () => { ro.disconnect(); ri.disconnect(); };
  }, [breite]);
  const hoeheIst = scroll ? h : hoehe;
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: hoeheIst * faktor }}>
      <div ref={innen} className="absolute left-0 top-0 flex flex-col origin-top-left" style={{ width: breite, height: scroll ? undefined : hoehe, minHeight: hoehe, transform: `scale(${faktor})` }}>
        {children}
        {scroll && h > hoehe + 2 && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-[#9AA1AE]" style={{ top: hoehe }}><span className="absolute right-3 top-1 text-xs text-[#6A7181]">Bildschirmende · darunter wird gescrollt</span></div>}
      </div>
    </div>
  );
}