/**
 * BundleModusToggle.jsx
 *
 * Sequenziell/Frei-Toggle am Bündel-Header (Phase C des Epic „Semantische
 * Dashboard-Sektoren"). Der frühere Sektor-Modus ist nach Phase A hart auf
 * 'sequenziell' fixiert — die Flexibilität wandert ans Bündel.
 *
 * BundleKind-spezifisches Verhalten:
 *   - 'lernpakete' → Toggle aktiv, Default 'sequenziell'.
 *   - 'aufgaben'   → Toggle aktiv, Default 'frei'.
 *   - 'projekte'   → Toggle disabled, Wert immer 'frei' (Tooltip erklärt warum).
 *
 * Daten-Binding:
 *   - Liest `bundle_config.modus`, fällt auf `getDefaultBundleModus(kind)`
 *     zurück, wenn nicht gesetzt.
 *   - Schreibt über `onChange(modus)` zurück. Der Aufrufer (Cockpit) ruft
 *     `setBundleModus` auf, das beim Wechsel auf 'sequenziell' eine
 *     ggf. gesetzte `erforderliche_anzahl` automatisch resettet.
 *
 * Optisch passt der Toggle zum bestehenden BundleErforderlichControl
 * (gleiche Größen, Bündel-Token-Farben).
 */

import React from 'react';
import { ListOrdered, Shuffle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getBundleKindByAcceptedTypes,
  getDefaultBundleModus,
  isBundleModusEditable,
} from '@/lib/sektorTypen';

export default function BundleModusToggle({
  acceptedTypes,
  modus, // 'sequenziell' | 'frei' | undefined
  disabled = false,
  onChange,
}) {
  const kind = getBundleKindByAcceptedTypes(acceptedTypes);
  if (!kind) return null;

  const editable = isBundleModusEditable(kind);
  const effective = modus || getDefaultBundleModus(kind);
  const lockedToFrei = !editable; // projekte
  const isReadOnly = disabled || lockedToFrei;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSet = (e, val) => {
    stop(e);
    if (isReadOnly) return;
    if (val === effective) return;
    onChange?.(val);
  };

  const tooltipText = lockedToFrei
    ? 'Projekt-Bündel sind immer frei wählbar.'
    : effective === 'sequenziell'
      ? 'Sequenziell: Schüler bearbeiten in fester Reihenfolge.'
      : 'Frei: Schüler wählen die Reihenfolge selbst.';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={stop}
            className={`shrink-0 inline-flex items-center rounded border border-bundle-border bg-white/80 p-0.5 text-[10px] font-semibold ${
              isReadOnly ? 'opacity-70' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => handleSet(e, 'sequenziell')}
              disabled={isReadOnly}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                effective === 'sequenziell'
                  ? 'bg-bundle text-bundle-foreground'
                  : 'text-bundle hover:bg-bundle/10'
              } ${isReadOnly ? 'cursor-not-allowed' : ''}`}
              title="Sequenziell"
            >
              <ListOrdered className="w-2.5 h-2.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => handleSet(e, 'frei')}
              disabled={disabled}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                effective === 'frei'
                  ? 'bg-bundle text-bundle-foreground'
                  : 'text-bundle hover:bg-bundle/10'
              } ${disabled ? 'cursor-not-allowed' : ''}`}
              title="Frei"
            >
              <Shuffle className="w-2.5 h-2.5" strokeWidth={2.5} />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}