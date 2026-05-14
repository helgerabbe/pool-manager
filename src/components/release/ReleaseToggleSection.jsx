/**
 * components/release/ReleaseToggleSection.jsx
 *
 * Phase 5 des Freigabe-Konzepts (2026-05-14):
 * Premium-Freigabe-Toggle für Modals. Drei Zustände:
 *   1) released=false + canRelease=false  → ausgegraut, Hinweis „erst nach Vollständigkeit"
 *   2) released=false + canRelease=true   → klickbar (graue Variante)
 *   3) released=true                       → grün, Klick = „Freigabe zurücknehmen"
 *
 * Wenn `hierarchyLockReason` gesetzt ist (z.B. Lernpaket oder Einheit darüber
 * ist freigegeben), wird der Toggle hart deaktiviert — auch das Zurücknehmen.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lock, Clock, Sparkles } from 'lucide-react';

export default function ReleaseToggleSection({
  isReleased,
  canRelease,         // boolean: Vollständigkeit erfüllt?
  hierarchyLocked,    // boolean: höhere Ebene gesperrt? → Toggle hart aus
  hierarchyLockMessage, // string | null
  onToggle,           // (next: boolean) => void
  disabled = false,
  releasedAt = null,
  releasedBy = null,
}) {
  const hardDisabled = disabled || hierarchyLocked;
  const softDisabledForRelease = !isReleased && !canRelease;
  const effectiveDisabled = hardDisabled || softDisabledForRelease;

  const handleClick = () => {
    if (effectiveDisabled) return;
    onToggle(!isReleased);
  };

  // ── Released ───────────────────────────────────────────────────────────
  if (isReleased) {
    return (
      <div className={cn(
        'w-full rounded-lg border-2 px-3 py-2.5 flex items-center gap-3 transition-all',
        hardDisabled
          ? 'border-green-300 bg-green-50/60 opacity-80'
          : 'border-green-400 bg-green-50'
      )}>
        <div className="shrink-0 p-1.5 rounded-full bg-green-200 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">Freigegeben</p>
          {releasedAt && (
            <p className="text-[11px] text-green-700/80 truncate">
              {new Date(releasedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
              {releasedBy && <> · {releasedBy}</>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={hardDisabled}
          className={cn(
            'shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
            hardDisabled
              ? 'border-green-300 text-green-700/60 cursor-not-allowed'
              : 'border-green-400 bg-white text-green-800 hover:bg-green-100'
          )}
          title={hardDisabled ? (hierarchyLockMessage || 'Sperre höherer Ebene') : 'Freigabe zurücknehmen'}
        >
          Freigabe zurücknehmen
        </button>
      </div>
    );
  }

  // ── Hard-Lock durch Hierarchie ─────────────────────────────────────────
  if (hardDisabled) {
    return (
      <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 flex items-center gap-3">
        <div className="shrink-0 p-1.5 rounded-full bg-slate-200 text-slate-600">
          <Lock className="w-4 h-4" />
        </div>
        <p className="flex-1 text-sm text-slate-700">
          {hierarchyLockMessage || 'Bearbeitung gesperrt'}
        </p>
      </div>
    );
  }

  // ── Soft-Lock weil unvollständig ───────────────────────────────────────
  if (softDisabledForRelease) {
    return (
      <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 flex items-center gap-3 opacity-90">
        <div className="shrink-0 p-1.5 rounded-full bg-slate-200 text-slate-500">
          <Clock className="w-4 h-4" />
        </div>
        <p className="flex-1 text-sm text-slate-700">
          Freigabe — erst nach Vollständigkeit möglich
        </p>
        <div className="shrink-0 h-6 w-11 rounded-full bg-slate-300 flex items-center p-0.5">
          <div className="h-5 w-5 rounded-full bg-white shadow-md" />
        </div>
      </div>
    );
  }

  // ── Freigabe-bereit ────────────────────────────────────────────────────
  // Wir packen "Vollständig"-Bestätigung + Toggle + Hinweistext in eine
  // einzige grüne Box, damit das Modal-Footer nicht aus zwei separaten
  // Bannern besteht (UX-Feedback 2026-05-14).
  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border border-green-300 bg-green-50/70 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer text-left"
    >
      <div className="shrink-0 p-1.5 rounded-full bg-green-100 text-green-700 mt-0.5">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-green-700" />
          Vollständig — bereit zur Freigabe
        </p>
        <p className="text-xs text-green-800/80 mt-0.5">
          Freigabe sperrt diese Aufgabe für weitere Bearbeitung.
        </p>
      </div>
      <div className="shrink-0 h-6 w-11 rounded-full bg-slate-400 flex items-center p-0.5 mt-1">
        <div className="h-5 w-5 rounded-full bg-white shadow-md" />
      </div>
    </button>
  );
}