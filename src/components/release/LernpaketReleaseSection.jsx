/**
 * components/release/LernpaketReleaseSection.jsx
 *
 * Phase 8 des Freigabe-Konzepts (2026-05-14):
 * Eigenständiger Block für das LernpaketPanel, der den Lernpaket-Freigabe-
 * Workflow visualisiert: Status, Bedingungen (alle Activities approved?),
 * und der zentrale Freigabe-Toggle.
 *
 * Greift auf dieselben Hooks wie die Activity-Modals zurück — Single Source
 * of Truth für Vollständigkeit + Sperre.
 */

import React from 'react';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLernpaketReleaseReadiness } from '@/hooks/useCompleteness';
import { useLernpaketLockState, useCanToggleLernpaketRelease } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';

export default function LernpaketReleaseSection({
  lernpaket,
  activities = [],
  einheit = null,
  kannBearbeiten = true,
  className = '',
}) {
  const readiness = useLernpaketReleaseReadiness(lernpaket, activities);
  const lockState = useLernpaketLockState(lernpaket, einheit);
  const canToggle = useCanToggleLernpaketRelease(lernpaket, einheit);
  const { setReleaseStatus, isPending } = useSetReleaseStatus();

  if (!lernpaket) return null;

  const isReleased =
    lernpaket.content_status === 'approved' && !!lernpaket.released_at;

  const handleToggle = (next) => {
    setReleaseStatus({
      targetType: 'lernpaket',
      targetId: lernpaket.id,
      release: next,
    });
  };

  // ── Released — read-only Banner ────────────────────────────────────────
  if (isReleased) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-green-400 bg-green-50 p-4 space-y-2',
        className
      )}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">
              Lernpaket ist freigegeben — alle Inhalte sind gesperrt
            </p>
            {lernpaket.released_at && (
              <p className="text-xs text-green-700 mt-0.5">
                Freigegeben am{' '}
                {new Date(lernpaket.released_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                {lernpaket.released_by && <> · {lernpaket.released_by}</>}
              </p>
            )}
          </div>
          {kannBearbeiten && canToggle.allowed && (
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
        {!canToggle.allowed && (
          <p className="text-xs text-green-700/80 pl-8">
            Einheit ist final freigegeben — Lernpaket-Freigabe kann nicht zurückgenommen werden.
          </p>
        )}
      </div>
    );
  }

  // ── Nicht freigegeben → Vollständigkeit zeigen + Toggle ────────────────
  const { blockingActivities = [] } = readiness;

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 space-y-3', className)}>
      <p className="text-sm font-semibold text-slate-800">Freigabe des Lernpakets</p>

      {readiness.isComplete ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-300 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Alle Aktivitäten sind freigegeben — bereit zur Lernpaket-Freigabe
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-sm font-medium text-amber-900">
              {blockingActivities.length} Aktivität{blockingActivities.length === 1 ? '' : 'en'} noch nicht freigegeben oder unvollständig
            </p>
          </div>
          {blockingActivities.length > 0 && (
            <ul className="mt-2 pl-6 space-y-1">
              {blockingActivities.slice(0, 5).map(a => (
                <li key={a.id} className="text-xs text-amber-900 list-disc">
                  {a.titel || a.id}
                </li>
              ))}
              {blockingActivities.length > 5 && (
                <li className="text-xs text-amber-800 italic">… und {blockingActivities.length - 5} weitere</li>
              )}
            </ul>
          )}
        </div>
      )}

      {kannBearbeiten && (
        <button
          type="button"
          onClick={() => handleToggle(true)}
          disabled={!readiness.isComplete || !canToggle.allowed || isPending || lockState.locked}
          className={cn(
            'w-full px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2',
            readiness.isComplete && canToggle.allowed
              ? 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer'
              : 'border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed'
          )}
          title={
            !canToggle.allowed
              ? 'Einheit ist final freigegeben — Freigabe gesperrt'
              : !readiness.isComplete
              ? 'Erst alle Aktivitäten freigeben'
              : 'Lernpaket freigeben (sperrt alle Inhalte)'
          }
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Lernpaket freigeben
        </button>
      )}
    </div>
  );
}