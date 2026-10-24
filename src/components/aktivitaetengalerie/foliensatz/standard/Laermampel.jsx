import React from 'react';
import { ampelFarbe } from '@/lib/lautstaerke';

const text = (w) => (w < 34 ? 'angenehm' : w < 67 ? 'etwas laut' : 'zu laut!');

/** Lärmampel: Die Lehrkraft schiebt den Regler von Grün nach Rot. */
export default function Laermampel() {
  const [wert, setWert] = React.useState(30);
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border bg-white px-2 py-1 text-[10px]">
      <span className="shrink-0">Ich empfinde die Lautstärke gerade als</span>
      <input type="range" min={0} max={100} value={wert} onChange={(e) => setWert(+e.target.value)}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
        style={{ background: 'linear-gradient(to right, hsl(120 70% 45%), hsl(60 70% 45%), hsl(0 70% 45%))', accentColor: ampelFarbe(wert) }} />
      <b className="w-14 shrink-0" style={{ color: ampelFarbe(wert) }}>{text(wert)}</b>
    </div>
  );
}