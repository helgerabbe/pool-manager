/**
 * SlideScaler.jsx
 *
 * Passt die feste 960×540-Folie verlustfrei in die verfügbare Breite ein.
 * Editor, Vorschau, Thumbnails und Schüler-Player nutzen exakt dieselbe
 * Skalierung — was die Lehrkraft sieht, sehen die Schüler.
 */
import React, { useEffect, useRef, useState } from 'react';
import { SLIDE_W, SLIDE_H } from '@/lib/slideshowVorlagen';

export default function SlideScaler({ children, className = '' }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setScale(el.clientWidth / SLIDE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `${SLIDE_W} / ${SLIDE_H}` }}>
      {scale > 0 && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0,
            width: SLIDE_W, height: SLIDE_H,
            transform: `scale(${scale})`, transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}