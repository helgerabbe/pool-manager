/**
 * Horizontale Menüleiste für die vier Onboarding-Schritte + Empfehlung.
 * Kompakt gehalten (kleine Schrift, keine Symbole, keine Nummern), damit alle
 * Schritte ohne horizontalen Scrollbalken nebeneinander passen. Der Schüler
 * kann jeden bereits besuchten Schritt direkt anspringen.
 */
const STEPS = [
  { key: 'einfuehrung', label: 'Überblick' },
  { key: 'selbst', label: 'Einschätzung' },
  { key: 'quiz', label: 'Wissens-Check' },
  { key: 'brian', label: 'Brian fragen' },
  { key: 'empfehlung', label: 'Empfehlung' },
];

export default function OnboardingStepNav({ aktiv, besucht, onSelect }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map(({ key, label }) => {
        const isAktiv = aktiv === key;
        const isBesucht = besucht.includes(key);
        const klickbar = isBesucht || isAktiv;
        return (
          <button
            key={key}
            onClick={() => klickbar && onSelect(key)}
            disabled={!klickbar}
            className={`flex-1 min-w-0 rounded-full px-2 py-1.5 text-[11px] sm:text-xs font-medium truncate transition-all ${
              isAktiv
                ? 'bg-primary text-primary-foreground shadow-sm'
                : klickbar
                ? 'bg-card border border-border text-foreground hover:bg-muted'
                : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export { STEPS };