import React from 'react';

// Standardformat Satzimpulse (2026-10-23): Satzanfänge als Sprechblasen, höchstens vier, je eine eigene Pastellfarbe.
const FARBEN = [
  { hg: '#E3EEFB', rand: '#9DBCE6', text: '#1F3A64' },
  { hg: '#FDEBDD', rand: '#F0B78C', text: '#6B3A14' },
  { hg: '#E2F3E8', rand: '#93CBA7', text: '#24553A' },
  { hg: '#EFE7F8', rand: '#BFA5DF', text: '#4A2F6E' },
];

export default function SatzImpulse({ impulse = [] }) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      {impulse.slice(0, 4).map((s, i) => {
        const c = FARBEN[i % FARBEN.length];
        return (
          <div key={i} className="relative rounded-[28px] border-2 px-7 py-4 text-[26px] font-semibold shadow-sm" style={{ background: c.hg, borderColor: c.rand, color: c.text }}>
            {s.replace(/\.{3}|…/g, '').trim()} …
            <span className="absolute -bottom-[14px] left-8 h-6 w-6 rotate-45 border-b-2 border-r-2" style={{ background: c.hg, borderColor: c.rand }} />
          </div>
        );
      })}
    </div>
  );
}