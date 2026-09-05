/**
 * LernlandkarteFortschrittsring.jsx
 *
 * Der Gesamtfortschritt der Einheit als Ring in der Kopfzeile: sichtbares
 * Ziel, das sich beim Arbeiten füllt. Zahl in der Mitte, damit klar bleibt,
 * wie weit es noch ist.
 */
import React from 'react';
import { motion } from 'framer-motion';

const R = 17;
const UMFANG = 2 * Math.PI * R;

export default function LernlandkarteFortschrittsring({ fertig = 0, gesamt = 0 }) {
  const anteil = gesamt > 0 ? fertig / gesamt : 0;
  const prozent = Math.round(anteil * 100);

  return (
    <div className="flex items-center gap-2.5" title={`${fertig} von ${gesamt} geschafft`}>
      <div className="relative h-11 w-11">
        <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
          <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
          <motion.circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke="#06d6a0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={UMFANG}
            initial={false}
            animate={{ strokeDashoffset: UMFANG * (1 - anteil) }}
            transition={{ type: 'spring', stiffness: 90, damping: 20 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
          {prozent}%
        </span>
      </div>
      <span className="text-xs font-semibold text-white/70">
        {fertig}/{gesamt} geschafft
      </span>
    </div>
  );
}