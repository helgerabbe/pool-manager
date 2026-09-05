/**
 * LernlandkarteKnotenWrapper.jsx
 *
 * Bewegung EINES Knotens (Etappe 2). Zwei geschachtelte Hüllen, weil beide
 * Bewegungen nebeneinander laufen müssen, ohne sich zu überschreiben:
 *   außen  — der Weg zur neuen Stelle, wenn sich der Fokus ändert
 *   innen  — ein leises Schweben, damit die Karte lebt statt zu stehen
 *
 * Der Knoten selbst zeichnet sich weiter bei 0/0 — die Stelle bestimmt die
 * Hülle.
 */
import React from 'react';
import { motion } from 'framer-motion';
import LernlandkarteKnoten from './LernlandkarteKnoten';

const NULL_POS = { x: 0, y: 0 };

export default function LernlandkarteKnotenWrapper({ node, position, status, aktiv, index, onClick }) {
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: position.x, y: position.y, opacity: 0, scale: 0.6 }}
      animate={{ x: position.x, y: position.y, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 18,
        // Die Zweige tauchen nacheinander auf — das führt den Blick nach außen.
        delay: Math.min(index * 0.045, 0.4),
      }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{
          duration: 5 + (index % 4),
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.3,
        }}
      >
        <LernlandkarteKnoten
          node={node}
          position={NULL_POS}
          status={status}
          aktiv={aktiv}
          onClick={onClick}
        />
      </motion.div>
    </motion.div>
  );
}