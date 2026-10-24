import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { CI_TIMER } from '@/lib/folienCI';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Live einstellbarer Timer: Zeit antippen = Minuten einstellen, Start/Pause per Klick. */
export default function FolienTimer({ start = 5, nurAnzeige }) {
  if (nurAnzeige) return (
    <span title="Die Zeit steuert deine Lehrkraft" className="flex h-9 items-center rounded-full px-3 text-base font-semibold tabular-nums" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text }}>{fmt(start * 60)}</span>
  );
  return <SteuerTimer start={start} />;
}

function SteuerTimer({ start }) {
  const [rest, setRest] = React.useState(start * 60);
  const [laeuft, setLaeuft] = React.useState(false);
  const [stellen, setStellen] = React.useState(false);
  const [min, setMin] = React.useState(start);

  React.useEffect(() => {
    if (!laeuft) return;
    const t = setInterval(() => setRest((r) => { if (r <= 1) { setLaeuft(false); return 0; } return r - 1; }), 1000);
    return () => clearInterval(t);
  }, [laeuft]);

  const uebernehmen = () => { const m = Math.max(1, Math.min(90, Number(min) || 1)); setRest(m * 60); setLaeuft(false); setStellen(false); };
  const farbe = rest === 0 ? { hg: '#F6D5D0', text: '#8A2A1C' } : CI_TIMER.normal;

  if (stellen) return (
    <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-lg font-semibold shadow ring-1 ring-[#DCDFE4]">
      <input type="number" min={1} max={90} autoFocus value={min} onChange={(e) => setMin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && uebernehmen()} className="w-16 rounded border px-2 text-center" />
      Min.
      <button onClick={uebernehmen} className="rounded-full bg-[#2A4074] px-3 py-0.5 text-white">OK</button>
    </span>
  );

  return (
    <span className="flex items-center gap-1 rounded-full py-1 pl-4 pr-1.5 text-lg font-semibold" style={{ background: farbe.hg, color: farbe.text }}>
      <button title="Zeit einstellen" onClick={() => { setLaeuft(false); setStellen(true); }} className="tabular-nums">{fmt(rest)}</button>
      <button title={laeuft ? 'Anhalten' : 'Starten'} onClick={() => rest > 0 && setLaeuft(!laeuft)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
        {laeuft ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      {rest === 0 && <button title="Neu starten" onClick={() => setRest(Math.max(1, Number(min) || start) * 60)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70"><RotateCcw className="h-4 w-4" /></button>}
    </span>
  );
}