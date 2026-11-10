import React from 'react';
import { Users } from 'lucide-react';

/** Hinweis oben im gemeinsamen E-Plan für Ehrgeizig und Passioniert. */
export default function EPlanHinweis() {
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
      <Users className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Gemeinsamer Arbeitsplan auf E-Niveau.</span> Ehrgeizig und Passioniert arbeiten mit diesem
        Plan bis zur schriftlichen Arbeit. Danach folgt der Projektbereich: Er bleibt gesperrt, bis du ihn nach Rückgabe der Arbeit
        freigibst. Änderungen hier gelten automatisch für beide Lerntypen.
      </p>
    </div>
  );
}