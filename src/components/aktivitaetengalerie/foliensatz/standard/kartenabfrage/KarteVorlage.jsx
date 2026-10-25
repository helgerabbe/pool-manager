import React from 'react';

export const KARTEN_FARBEN = ['bg-[#FFF4C2]', 'bg-[#DCEBFA]', 'bg-[#E3F4E1]', 'bg-[#FBE3CF]'];
const LINIEN = { backgroundImage: 'repeating-linear-gradient(transparent 0, transparent 1.45em, rgba(62,92,138,0.18) 1.45em, rgba(62,92,138,0.18) calc(1.45em + 1px))' };

/** Layout-Vorlage Moderationskarte: liniertes Kärtchen mit roter Kopflinie und leichtem Schatten. */
export default function KarteVorlage({ farbe = KARTEN_FARBEN[0], className = '', children, ...rest }) {
  return (
    <div {...rest} className={`relative rounded-[4px] shadow-[0_2px_6px_rgba(42,64,116,0.18)] ${farbe} ${className}`}>
      <div className="h-[3px] rounded-t-[4px] bg-[#E07A5F]/70" />
      <div className="px-[0.6em] py-[0.35em] leading-[1.45em]" style={LINIEN}>{children}</div>
    </div>
  );
}