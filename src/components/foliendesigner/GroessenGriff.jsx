import React from 'react';

/** Griff zum Größer- und Kleinerziehen. nurBreite = nur die Länge ändern (dünner Pfeil). */
export default function GroessenGriff({ el, nurBreite, setze }) {
  const start = (e) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, b = el.b, h = el.h;
    const bewegen = (m) => setze({ b: Math.max(30, b + m.clientX - sx), ...(nurBreite ? {} : { h: Math.max(20, h + m.clientY - sy) }) });
    const ende = () => { window.removeEventListener('pointermove', bewegen); window.removeEventListener('pointerup', ende); };
    window.addEventListener('pointermove', bewegen); window.addEventListener('pointerup', ende);
  };
  return (
    <span onPointerDown={start} onClick={(e) => e.stopPropagation()} draggable={false} onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`absolute h-3.5 w-3.5 rounded-sm border-2 border-primary bg-background ${nurBreite ? '-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize' : '-bottom-2 -right-2 cursor-nwse-resize'}`} />
  );
}