import React from 'react';
import { CI_GRUND } from '@/lib/folienCI';
import { CI_FORMEN } from '@/lib/folienCIElemente';

const f = { fill: CI_FORMEN.fuellung, stroke: CI_FORMEN.rand, strokeWidth: CI_FORMEN.linie };
const l = { stroke: CI_GRUND.text, strokeWidth: 2, strokeLinecap: 'round', fill: 'none' };

/** Vorschau Teil 14a: Formen, Linien und Pfeile. */
export default function CiFormenVorschau() {
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <svg viewBox="0 0 640 90" className="w-full">
        <rect x="6" y="15" width="90" height="60" rx="12" {...f} />
        <ellipse cx="160" cy="45" rx="45" ry="30" {...f} />
        <path d="M250 75 L290 15 L330 75 Z" strokeLinejoin="round" {...f} />
        <line x1="355" y1="45" x2="415" y2="45" {...l} />
        <line x1="435" y1="45" x2="485" y2="45" {...l} /><path d="M480 39 L492 45 L480 51 Z" fill={CI_GRUND.text} />
        <path d="M505 33 H575 V20 L630 45 L575 70 V57 H505 Z" strokeLinejoin="round" {...f} />
      </svg>
      <p className="text-xs text-muted-foreground">{CI_FORMEN.regel}</p>
    </div>
  );
}