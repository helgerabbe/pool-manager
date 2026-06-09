import { AArrowDown, AArrowUp, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LESE_GROESSEN } from '@/hooks/useLeseEinstellungen';

const OPTIONS = [
  { key: 'klein', label: 'Klein', Icon: AArrowDown },
  { key: 'mittel', label: 'Mittel', Icon: Type },
  { key: 'gross', label: 'Groß', Icon: AArrowUp },
];

/**
 * Kompakter Umschalter für die Lese-Schriftgröße (klein / mittel / groß).
 * Wird über jedem Lesetext angezeigt, damit leseschwächere Schüler die
 * Darstellung an ihre Bedürfnisse anpassen können.
 */
export default function LeseSchriftgroesseToggle({ groesse, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
      <span className="sr-only">Schriftgröße wählen</span>
      {OPTIONS.map(({ key, label, Icon }) => {
        const aktiv = (LESE_GROESSEN.includes(groesse) ? groesse : 'mittel') === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={aktiv}
            title={`Schriftgröße: ${label}`}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              aktiv
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}