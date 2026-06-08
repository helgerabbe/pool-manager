import { BookOpen, Gauge, ClipboardCheck, MessageCircle, Sparkles, Check } from 'lucide-react';

/**
 * Horizontale Menüleiste für die vier Onboarding-Schritte + Empfehlung.
 * Der Schüler kann jeden bereits besuchten Schritt direkt anspringen.
 */
const STEPS = [
  { key: 'einfuehrung', label: 'Überblick', Icon: BookOpen },
  { key: 'selbst', label: 'Einschätzung', Icon: Gauge },
  { key: 'quiz', label: 'Wissens-Check', Icon: ClipboardCheck },
  { key: 'brian', label: 'Brian fragen', Icon: MessageCircle },
  { key: 'empfehlung', label: 'Empfehlung', Icon: Sparkles },
];

export default function OnboardingStepNav({ aktiv, besucht, onSelect }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {STEPS.map(({ key, label, Icon }, i) => {
        const isAktiv = aktiv === key;
        const isBesucht = besucht.includes(key);
        const klickbar = isBesucht || isAktiv;
        return (
          <button
            key={key}
            onClick={() => klickbar && onSelect(key)}
            disabled={!klickbar}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              isAktiv
                ? 'bg-primary text-primary-foreground shadow-sm'
                : klickbar
                ? 'bg-card border border-border text-foreground hover:bg-muted'
                : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center w-4 h-4">
              {isBesucht && !isAktiv ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Icon className="w-3.5 h-3.5" />}
            </span>
            <span className="hidden sm:inline">{i + 1}. {label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        );
      })}
    </div>
  );
}

export { STEPS };