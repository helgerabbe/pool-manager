import React from 'react';
import { ampelFarbe } from '@/lib/lautstaerke';

const text = (w) => (w < 34 ? 'angenehm' : w < 67 ? 'etwas laut' : 'zu laut!');

/** Lärmampel: Die Lehrkraft schiebt den Regler von Grün nach Rot. */
export default function Laermampel() {
  const [wert, setWert] = React.useState(30);
  return (
    <div className="w-full rounded-lg border bg-white px-2 py-1 text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <b>Lautstärke gerade</b>
        <b style={{ color: ampelFarbe(wert) }}>{text(wert)}</b>
      </div>
      <input type="range" min={0} max={100} value={wert} onChange={(e) => setWert(+e.target.value)}
        className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: 'linear-gradient(to right, hsl(120 70% 45%), hsl(60 70% 45%), hsl(0 70% 45%))', accentColor: ampelFarbe(wert) }} />
    </div>
  );
}