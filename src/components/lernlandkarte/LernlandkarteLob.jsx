/**
 * LernlandkarteLob.jsx
 *
 * Kurzer Lob-Ruf über der Karte, wenn ein Lernziel auf „Kann ich" steht.
 * Verschwindet von selbst — er soll niemanden vom Weiterarbeiten abhalten.
 */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

export default function LernlandkarteLob({ text }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[#06d6a0]/50 bg-[#0f2a24] px-5 py-3 shadow-lg"
        >
          <Trophy className="h-5 w-5 text-[#06d6a0]" />
          <span className="font-display text-base font-bold text-white">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}