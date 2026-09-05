/**
 * lernlandkarteFeier.js
 *
 * Die kleine Belohnung der Lernlandkarte (Etappe 3). Bewusst sparsam: Konfetti
 * und ein Lob gibt es NUR, wenn ein Lernziel auf „Kann ich" steht. Sonst wäre
 * das Fest nach fünf Minuten nichts mehr wert.
 */
import confetti from 'canvas-confetti';

const LOB = [
  'Stark! Das sitzt.',
  'Geschafft — weiter so!',
  'Sauber gemacht!',
  'Das kannst du jetzt.',
];

/** Wirft Konfetti und gibt einen Lobsatz zurück — oder null, wenn nichts zu feiern ist. */
export function feiereStufe(stufe) {
  if (stufe !== 'sicher') return null;
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    origin: { x: 0.5, y: 0.7 },
    colors: ['#06d6a0', '#48cae4', '#ffd166', '#f77f00'],
    disableForReducedMotion: true,
  });
  return LOB[Math.floor(Math.random() * LOB.length)];
}