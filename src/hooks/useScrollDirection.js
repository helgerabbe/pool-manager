/**
 * useScrollDirection.js
 *
 * Beobachtet die Scroll-Richtung eines beliebigen Containers (per Ref) und liefert
 * `hidden = true`, sobald der Nutzer ein Stück nach unten gescrollt hat. Beim
 * Hochscrollen oder am oberen Rand wird `hidden = false` gesetzt.
 *
 * Ziel: kompakte Auto-Hide-Header in scrollbaren Bereichen, ähnlich wie in
 * Notion/Linear. Der Hook ist absichtlich klein und macht KEINE DOM-Mutationen.
 *
 * Parameter:
 *   - containerRef: Ref auf das Element, dessen Scroll-Position beobachtet wird.
 *   - threshold:    Mindest-Scroll-Distanz in Pixeln, bevor der Header ausgeblendet
 *                   wird (verhindert Flackern bei Mini-Scrolls). Default: 24 px.
 *
 * Rückgabe: { hidden: boolean }
 */

import { useEffect, useRef, useState } from 'react';

export function useScrollDirection(containerRef, { threshold = 24 } = {}) {
  const [hidden, setHidden] = useState(false);
  const lastTop = useRef(0);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return undefined;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const top = el.scrollTop;
        const delta = top - lastTop.current;
        // Am oberen Rand immer sichtbar.
        if (top <= 4) {
          setHidden(false);
        } else if (delta > threshold) {
          setHidden(true);
          lastTop.current = top;
        } else if (delta < -threshold) {
          setHidden(false);
          lastTop.current = top;
        }
        // Im "Dead-Zone"-Bereich (kleine Scrolls) lastTop NICHT aktualisieren,
        // damit ein längeres langsames Hochscrollen kumulativ wirken kann.
        ticking = false;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [containerRef, threshold]);

  return { hidden };
}

export default useScrollDirection;