/**
 * components/release/AllgemeineAufgabeReleaseSection.jsx
 *
 * Phase 9 des Freigabe-Konzepts (2026-05-14):
 * Drop-in-Komponente für `AufgabeCreateView` und `ProjektCreateView`.
 * Zeigt:
 *   - Vollständigkeits-Indikator (live)
 *   - Freigabe-Toggle (an Vollständigkeit + Hierarchie gekoppelt)
 *   - Read-Only-Banner bei freigegebener Aufgabe
 *
 * Eltern-Komponente entscheidet selbst, alle Edit-Felder bei `isReleased`
 * read-only zu schalten (z.B. via `disabled={isReleased}`).
 */

import React from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CompletenessIndicator from './CompletenessIndicator';
import ReleaseToggleSection from './ReleaseToggleSection';
import {
  useAllgemeineAufgabeCompleteness,
  useProjektaufgabeCompleteness,
} from '@/hooks/useCompleteness';
import { useAllgemeineAufgabeLockState } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';
import { isEinheitLocked } from '@/lib/releaseLockCheck';

export default function AllgemeineAufgabeReleaseSection({
  aufgabe,
  einheit = null,
  kannBearbeiten = true,
  variant = 'auto',          // 'auto' | 'allgemein' | 'projekt'
  className = '',
}) {
  // WICHTIG: Hooks IMMER vor jedem early-return aufrufen (react-hooks/rules-of-hooks).
  // Deshalb arbeiten wir mit defensiven Defaults für aufgabe===null.
  const isProjekt =
    variant === 'projekt' ||
    (variant === 'auto' && aufgabe?.anforderungsebene === '3 - Projekt');

  const allgemeinResult = useAllgemeineAufgabeCompleteness(aufgabe);
  const projektResult = useProjektaufgabeCompleteness(aufgabe);
  const completeness = isProjekt ? projektResult : allgemeinResult;

  const lockState = useAllgemeineAufgabeLockState(aufgabe, einheit);
  const einheitLocked = isEinheitLocked(einheit);
  const { setReleaseStatus, isPending } = useSetReleaseStatus();

  if (!aufgabe) return null;

  // Privat-Modus: Private Einheiten nutzen den Freigabe-Workflow nicht —
  // Aufgaben gelten als automatisch freigegeben, der Toggle entfällt.
  if (einheit?.sichtbarkeit === 'privat') return null;

  const isReleased = aufgabe.content_status === 'approved';

  const handleToggle = (next) => {
    setReleaseStatus({
      targetType: 'allgemeine_aufgabe',
      targetId: aufgabe.id,
      release: next,
    });
  };

  // ── Released: Banner mit Rücknahme ──────────────────────────────────────
  if (isReleased) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-green-400 bg-green-50 p-4',
        className
      )}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">
              {isProjekt ? 'Projektaufgabe ist freigegeben — Bearbeitung gesperrt' : 'Aufgabe ist freigegeben — Bearbeitung gesperrt'}
            </p>
            {aufgabe.released_at && (
              <p className="text-xs text-green-700 mt-0.5">
                Freigegeben am{' '}
                {new Date(aufgabe.released_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                {aufgabe.released_by && <> · {aufgabe.released_by}</>}
              </p>
            )}
          </div>
          {kannBearbeiten && !einheitLocked && (
            <button
              type="button"
              onClick={() => handleToggle(false)}
              disabled={isPending}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md border border-green-400 bg-white text-green-800 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Freigabe zurücknehmen
            </button>
          )}
        </div>
        {einheitLocked && (
          <p className="text-xs text-green-700/80 pl-8 mt-2">
            Einheit ist final freigegeben — Rücknahme nicht möglich.
          </p>
        )}
      </div>
    );
  }

  // ── Nicht freigegeben: Indikator + Toggle ───────────────────────────────
  return (
    <div className={cn('space-y-3', className)}>
      <CompletenessIndicator result={completeness} />
      {kannBearbeiten && (
        <ReleaseToggleSection
          isReleased={false}
          canRelease={completeness.isComplete}
          hierarchyLocked={einheitLocked}
          hierarchyLockMessage={einheitLocked ? 'Einheit ist final freigegeben — Freigaben gesperrt' : null}
          onToggle={handleToggle}
          disabled={isPending}
        />
      )}
    </div>
  );
}