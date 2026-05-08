/**
 * ModusAuswahlBox.jsx
 *
 * AP2 / MBK-Schema v1.1.0 §3 — UI-Eingangstür für Phasen-Aktivitäten.
 *
 * Zwei klare Karten als visuelle Entscheidungshilfe:
 *   - „Selbst ausarbeiten" (manuell) → klassischer Master-Aufgaben-Workflow
 *   - „KI ausarbeiten lassen" (ki)   → Briefing-Formular wird angezeigt
 *
 * Bewusst dumm/visuell. Logik (Persistenz, Konsistenz von field_values vs.
 * ki_briefing) liegt im Backend in `updateActivitySecure` (siehe §3 dort).
 * Diese Komponente ist nur ein kontrollierter Toggle — sie ruft `onChange`
 * mit dem neuen Modus auf, der Caller entscheidet, was passiert.
 */

import React from 'react';
import { Pencil, Sparkles, Lock } from 'lucide-react';

const CARDS = [
  {
    value: 'manuell',
    title: 'Selbst ausarbeiten',
    description:
      'Du erstellst die Aufgaben als Mastervorlagen selbst. Die KI kann später Varianten daraus klonen.',
    icon: Pencil,
    accent: 'border-primary/40 bg-primary/5 text-primary',
  },
  {
    value: 'ki',
    title: 'KI ausarbeiten lassen',
    description:
      'Du gibst nur einen Schwerpunkt + ein paar Parameter an. Die KI baut die Aufgabe komplett.',
    icon: Sparkles,
    accent: 'border-accent/40 bg-accent/5 text-accent-foreground',
  },
];

export default function ModusAuswahlBox({
  value = 'manuell',
  onChange,
  disabled = false,
  disabledReason = null,
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Wer erstellt diese Aufgabe?
          </p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            Du kannst jederzeit umschalten — der Wechsel verwirft die andere Seite.
          </p>
        </div>
        {disabled && disabledReason && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded">
            <Lock className="w-3 h-3" /> {disabledReason}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map(({ value: v, title, description, icon: Icon, accent }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && v !== value && onChange?.(v)}
              className={[
                'text-left rounded-lg border-2 p-4 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/60',
                active ? `${accent} border-current` : 'border-border bg-background',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${active ? '' : 'text-muted-foreground'}`} />
                <p className={`text-sm font-semibold ${active ? '' : 'text-foreground'}`}>
                  {title}
                </p>
                {active && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide">
                    aktiv
                  </span>
                )}
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  active ? 'opacity-90' : 'text-muted-foreground'
                }`}
              >
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}