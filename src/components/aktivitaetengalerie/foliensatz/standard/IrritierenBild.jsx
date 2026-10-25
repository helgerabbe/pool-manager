import React from 'react';

/** Standardfolie „Irritieren und neugierig machen“: nur der Impuls, optional verblassendes Foto. */
export default function IrritierenBild({ ansicht }) {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600" alt="" className="absolute bottom-0 right-0 h-full w-1/2 object-cover opacity-40" style={{ maskImage: 'linear-gradient(to top left, black 30%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to top left, black 30%, transparent 85%)' }} />
      <p className="relative max-w-[80%] text-center text-lg font-bold leading-snug">Wer nicht perfekt Hochdeutsch spricht, hat keine Chance auf Erfolg.</p>
      {ansicht === 'lehrer' && <p className="absolute bottom-0 left-0 text-[9px] text-[#6A7181]">Lehrergerät: Stille aushalten.</p>}
    </div>
  );
}