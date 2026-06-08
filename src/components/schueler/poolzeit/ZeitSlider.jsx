import { Slider } from '@/components/ui/slider';

/**
 * Wiederverwendbarer 5-Minuten-Schieberegler für Zeiteinstellungen.
 * Zeigt den aktuellen Wert groß und prominent an.
 */
export default function ZeitSlider({ value, onChange, min = 5, max = 120, farbe }) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <span className="text-5xl font-bold tracking-tight" style={{ color: farbe || undefined }}>
          {value}
        </span>
        <span className="text-2xl font-medium text-muted-foreground ml-2">Minuten</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={5}
        onValueChange={(v) => onChange(v[0])}
        className="w-full max-w-md"
      />
      <div className="flex justify-between w-full max-w-md text-xs text-muted-foreground">
        <span>{min} Min</span>
        <span>{max} Min</span>
      </div>
    </div>
  );
}