/**
 * components/release/CompletenessIndicator.jsx
 *
 * Phase 5 des Freigabe-Konzepts (2026-05-14):
 * Zeigt im Modal-Footer (oberhalb des Freigabe-Toggles) den Live-Status
 * der Vollständigkeit:
 *   🟡 „Unvollständig — N Pflichtfeld(er) fehlen" (klickbar → Tooltip-Liste)
 *   ✅ „Vollständig — bereit zur Freigabe"
 *
 * Erwartet die Resultat-Struktur aus lib/completenessValidation.js:
 *   { isComplete: boolean, missingFields: [{ fieldName, label, reason }] }
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CompletenessIndicator({ result, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  const { isComplete, missingFields = [] } = result;

  if (isComplete) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border border-green-300 bg-green-50',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
        <p className="text-sm font-medium text-green-800 flex-1">
          Vollständig — bereit zur Freigabe
        </p>
      </div>
    );
  }

  const count = missingFields.length;
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300 bg-amber-50 overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-100 transition-colors text-left"
        aria-expanded={expanded}
      >
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
        <p className="text-sm font-medium text-amber-900 flex-1">
          Unvollständig — {count} Pflichtfeld{count === 1 ? '' : 'er'} fehl{count === 1 ? 't' : 'en'}
        </p>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-amber-700 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-amber-700 shrink-0" />}
      </button>
      {expanded && (
        <ul className="px-3 pb-2 pt-1 border-t border-amber-200 bg-amber-50/50 space-y-1">
          {missingFields.map((m, i) => (
            <li key={`${m.fieldName}-${i}`} className="text-xs text-amber-900 flex items-start gap-1.5">
              <span className="text-amber-600 mt-0.5">•</span>
              <span>
                <span className="font-medium">{m.label || m.fieldName}</span>
                {m.reason && <span className="text-amber-700"> — {m.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}