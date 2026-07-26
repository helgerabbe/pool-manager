/**
 * components/workspace/lernpaketWizard/WizardStepSection.jsx
 *
 * Nummerierter Schritt-Abschnitt für den Lernpaket-Wizard: kleine
 * Nummern-Plakette + Titel + optionale rechte Kopfzeilen-Elemente.
 * Sorgt für die klare "Schritt 1 → 2 → 3"-Führung im Dialog.
 */
import React from 'react';

export default function WizardStepSection({ nummer, titel, rechts = null, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
            {nummer}
          </span>
          {titel}
        </h3>
        {rechts}
      </div>
      <div className="pl-7 space-y-3">{children}</div>
    </section>
  );
}