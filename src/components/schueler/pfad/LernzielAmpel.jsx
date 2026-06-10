import { cn } from '@/lib/utils';

/**
 * Selbsteinschätzungs-Ampel für ein Lernziel auf der Lernlandkarte.
 * Drei Stufen: Kann ich / Bin unsicher / Brauche Hilfe.
 * Erneutes Tippen auf die aktive Stufe hebt die Einschätzung wieder auf.
 */
const OPTIONEN = [
  {
    value: 'sicher',
    emoji: '💪',
    label: 'Kann ich',
    aktiv: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  {
    value: 'unsicher',
    emoji: '🤔',
    label: 'Unsicher',
    aktiv: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  {
    value: 'schwierig',
    emoji: '🆘',
    label: 'Brauche Hilfe',
    aktiv: 'bg-red-100 text-red-700 border-red-300',
  },
];

export default function LernzielAmpel({ value, onSelect, disabled }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {OPTIONEN.map((opt) => {
        const istAktiv = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.value)}
            title={opt.label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition-all',
              istAktiv
                ? `${opt.aktiv} shadow-sm scale-105`
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground opacity-70 hover:opacity-100',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="text-sm leading-none">{opt.emoji}</span>
            <span className={istAktiv ? '' : 'hidden sm:inline'}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}