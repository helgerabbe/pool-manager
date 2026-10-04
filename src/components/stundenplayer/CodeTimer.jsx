import React from 'react';
import { KeyRound, Timer } from 'lucide-react';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Großer Code + Countdown der geplanten Zeit. Nach Ablauf zählt die Zeit rot weiter. */
export default function CodeTimer({ code, minuten, gestartetAm }) {
  const [jetzt, setJetzt] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const vergangen = Math.floor((jetzt - gestartetAm) / 1000);
  const rest = (minuten || 0) * 60 - vergangen;
  const ueber = minuten && rest < 0;

  return (
    <div className="flex items-center gap-8 rounded-2xl bg-white/10 px-8 py-4 text-white">
      {code && (
        <div className="text-center">
          <p className="flex items-center gap-1 text-sm text-white/70"><KeyRound className="h-4 w-4" /> Code</p>
          <p className="font-mono text-6xl font-bold tracking-widest">{code}</p>
        </div>
      )}
      <div className="text-center">
        <p className="flex items-center gap-1 text-sm text-white/70"><Timer className="h-4 w-4" /> {minuten ? `${minuten} Min. eingeplant` : 'Zeit'}</p>
        <p className={`font-mono text-6xl font-bold ${ueber ? 'text-red-400' : ''}`}>
          {minuten ? (ueber ? `+${mmss(-rest)}` : mmss(rest)) : mmss(vergangen)}
        </p>
      </div>
    </div>
  );
}