import { cn } from '@/lib/utils';
import { LESE_GROESSEN } from '@/hooks/useLeseEinstellungen';

const OPTIONS = [
  { key: 'klein', label: 'Klein' },
  { key: 'mittel', label: 'Mittel' },
  { key: 'gross', label: 'Groß' },
];

/**
 * Kompakter Umschalter für die Lese-Schriftgröße (klein / mittel / groß).
 * Wird über jedem Lesetext angezeigt, damit leseschwächere Schüler die
 * Darstellung an ihre Bedürfnisse anpassen können.
 */
export default function LeseSchriftgroesseToggle({ groesse, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-sm">
      <span className="sr-only">Schriftgröße wählen</span>
      {OPTIONS.map(({ key, label }) => {
        const aktiv = (LESE_GROESSEN.includes(groesse) ? groesse : 'mittel') === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={aktiv}
            title={`Schriftgröße: ${label}`}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              aktiv
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}