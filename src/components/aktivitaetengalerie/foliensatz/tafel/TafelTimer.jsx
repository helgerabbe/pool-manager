import React from 'react';
import { CI_TIMER } from '@/lib/folienCI';

/** Großer Timer der Funktionstafel; in der letzten Minute in Endspurt-Farbe. */
export default function TafelTimer({ sekunden }) {
  const s = sekunden <= 60 ? CI_TIMER.bald : CI_TIMER.normal;
  const text = `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
  return <span className="flex h-36 w-36 items-center justify-center rounded-full border-8 text-5xl font-bold" style={{ background: s.hg, color: s.text, borderColor: s.ring }}>{text}</span>;
}