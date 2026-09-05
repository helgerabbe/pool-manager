/**
 * KleinerBildschirmHinweis.jsx
 *
 * Die Lernlandkarte (und der Lernbereich überhaupt) ist fürs Tablet oder den
 * Rechner gedacht — auf dem Handy fehlt einfach der Platz. Statt die Karte
 * zusammenzuquetschen, sagen wir das freundlich und deutlich.
 *
 * `als="overlay"` deckt die Fläche ganz ab (Lernlandkarte),
 * `als="banner"` ist der schmale Hinweis fürs Dashboard.
 */
import React, { useEffect, useState } from 'react';
import { MonitorSmartphone, TabletSmartphone } from 'lucide-react';

const MIN_BREITE = 900;
const MIN_HOEHE = 520;

export function useKleinerBildschirm() {
  const [klein, setKlein] = useState(
    () => window.innerWidth < MIN_BREITE || window.innerHeight < MIN_HOEHE
  );
  useEffect(() => {
    const pruefe = () =>
      setKlein(window.innerWidth < MIN_BREITE || window.innerHeight < MIN_HOEHE);
    window.addEventListener('resize', pruefe);
    window.addEventListener('orientationchange', pruefe);
    return () => {
      window.removeEventListener('resize', pruefe);
      window.removeEventListener('orientationchange', pruefe);
    };
  }, []);
  return klein;
}

export default function KleinerBildschirmHinweis({ als = 'overlay', titel }) {
  const klein = useKleinerBildschirm();
  if (!klein) return null;

  if (als === 'banner') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
        <TabletSmartphone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">Nimm lieber ein Tablet oder den Rechner.</span>{' '}
          Auf dem Handy ist der Bildschirm zu klein — du siehst dann nicht alles,
          was du zum Arbeiten brauchst.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b132b] px-6 py-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-[#48cae4]">
          <MonitorSmartphone className="h-8 w-8" />
        </span>
        <h2 className="font-display text-2xl font-bold text-white leading-tight">
          Die Lernlandkarte braucht mehr Platz
        </h2>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          {titel ? `„${titel}" ` : 'Deine Einheit '}wartet auf dich — aber die
          Karte zeigt viele Wege gleichzeitig. Wechsel bitte aufs Tablet oder an
          den Rechner, dann kannst du richtig losstöbern.
        </p>
      </div>
    </div>
  );
}