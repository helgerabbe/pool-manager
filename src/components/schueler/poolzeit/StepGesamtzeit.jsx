import PoolzeitStepShell from './PoolzeitStepShell';
import ZeitSlider from './ZeitSlider';

/**
 * Schritt 1: „Wie viel Zeit hast du heute?" – Gesamtzeit per 5-Min-Slider.
 */
export default function StepGesamtzeit({ gesamtzeit, setGesamtzeit, onWeiter, onZurueck }) {
  return (
    <PoolzeitStepShell
      titel="Wie viel Zeit hast du heute?"
      untertitel="Stell ein, wie lange deine Poolzeit ungefähr dauern soll."
      onWeiter={onWeiter}
      onZurueck={onZurueck}
    >
      <ZeitSlider value={gesamtzeit} onChange={setGesamtzeit} min={5} max={120} />
    </PoolzeitStepShell>
  );
}