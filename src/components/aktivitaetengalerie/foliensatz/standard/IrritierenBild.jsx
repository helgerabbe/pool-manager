import React from 'react';

/** Standardfolie „Irritieren und neugierig machen“: nur der Impuls, optional verblassendes Foto. */
export default function IrritierenBild({ ansicht }) {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <img src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/9d7ed35a8_generated_image.png" alt="" className="absolute -top-2 right-0 h-10 w-10 rounded-full bg-white object-contain p-0.5 shadow-sm" />
      <p className="relative max-w-[80%] text-center text-lg font-bold leading-snug">Wer nicht perfekt Hochdeutsch spricht, hat keine Chance auf Erfolg.</p>
      {ansicht === 'lehrer' && <p className="absolute bottom-0 left-0 text-[9px] text-[#6A7181]">Lehrergerät: Stille aushalten.</p>}
    </div>
  );
}