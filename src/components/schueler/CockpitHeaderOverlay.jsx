import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import CockpitHeader from '@/components/schueler/CockpitHeader';

/**
 * Verborgener Cockpit-Header. Standardmäßig ist nur ein kleines Dreieck oben
 * mittig sichtbar. Ein Klick darauf blendet den Header als Overlay von oben
 * ein (wie ein Toaster), ein erneuter Klick blendet ihn wieder aus. So bleibt
 * der obere Bildschirmbereich als Arbeitsfläche frei.
 */
export default function CockpitHeaderOverlay({ name }) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      {/* Overlay-Header, der von oben einfährt */}
      <AnimatePresence>
        {offen && (
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 z-40"
          >
            <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-5 pb-4">
              <div className="rounded-2xl border border-border bg-card shadow-lg px-5 py-4">
                <CockpitHeader name={name} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kleines Dreieck oben mittig zum Ein-/Ausblenden */}
      <button
        onClick={() => setOffen((v) => !v)}
        aria-label={offen ? 'Header ausblenden' : 'Header einblenden'}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-12 h-7 rounded-b-xl border border-t-0 border-border bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
    </>
  );
}