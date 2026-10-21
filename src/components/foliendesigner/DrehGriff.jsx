import React from 'react';
import { RotateCw } from 'lucide-react';

export const DREHBAR = ['rechteck', 'ellipse', 'dreieck', 'linie', 'pfeil_duenn', 'pfeil_breit', 'freihand'];
export const istDrehbar = (el) => DREHBAR.includes(el.typ) && !(el.typ === 'ellipse' && el.form === 'kreis');

/** Griff oben in der Mitte zum Drehen. Mit gedrückter Umschalttaste in 15°-Schritten. */
export default function DrehGriff({ setze }) {
  const start = (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = e.currentTarget.parentElement.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const bewegen = (m) => {
      let w = (Math.atan2(m.clientY - my, m.clientX - mx) * 180) / Math.PI + 90;
      w = m.shiftKey ? Math.round(w / 15) * 15 : Math.round(w);
      setze({ drehung: (w + 360) % 360 });
    };
    const ende = () => { window.removeEventListener('pointermove', bewegen); window.removeEventListener('pointerup', ende); };
    window.addEventListener('pointermove', bewegen); window.addEventListener('pointerup', ende);
  };
  return (
    <span onPointerDown={start} onClick={(e) => e.stopPropagation()} draggable={false} onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }} title="Drehen"
      className="absolute -top-8 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
      <RotateCw className="h-3 w-3" />
    </span>
  );
}