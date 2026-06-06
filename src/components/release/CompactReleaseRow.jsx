/**
 * components/release/CompactReleaseRow.jsx
 *
 * UX-Iteration 2026-05-14:
 * Kompakte Ein-Zeilen-Variante des Modal-Footers, die den separaten
 * `CompletenessIndicator` und `ReleaseToggleSection` zu einer einzigen
 * horizontalen Zeile zusammenfasst:
 *
 *   [ Status-Label · ggf. Subtext ]   [ Toggle-Switch ]
 *
 * Welche Pflichtfelder fehlen, ist in der Modal-Form bereits durch die roten
 * Sternchen sichtbar – wir wiederholen das hier bewusst NICHT.
 *
 * Vier visuelle Zustände (analog ReleaseToggleSection):
 *   1) released=true                         → grün, Toggle aktiv (Rücknahme)
 *   2) hierarchyLocked                       → grau, Lock-Icon, kein Toggle
 *   3) !canRelease (unvollständig)           → amber, Toggle ausgegraut
 *   4) canRelease && !released               → grün-bereit, Toggle klickbar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Lock, Sparkles } from 'lucide-react';

function Toggle({ on, disabled, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      className={cn(
        'shrink-0 h-6 w-11 rounded-full flex items-center p-0.5 transition-colors',
        on ? 'bg-green-500' : 'bg-slate-300',
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-90',
      )}
    >
      <div
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow-md transition-transform',
          on ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export default function CompactReleaseRow({
  isReleased,      // tatsächlicher DB-Status
  pendingRelease,  // lokaler UI-State (null = unverändert, true/false = geändert)
  canRelease,
  hierarchyLocked,
  hierarchyLockMessage,
  missingCount = 0,
  missingFields = [], // [{ fieldName, label, reason }] — für konkrete Auflistung
  onToggle,        // (newValue: boolean) => void — nur lokaler State, kein API-Call
  disabled = false,
  releasedAt = null,
  releasedBy = null,
}) {
  // Angezeigter Status: pendingRelease überschreibt isReleased wenn gesetzt
  const displayReleased = pendingRelease !== null && pendingRelease !== undefined
    ? pendingRelease
    : isReleased;

  const hardDisabled = disabled || hierarchyLocked;
  const softDisabledForRelease = !displayReleased && !canRelease;
  const effectiveDisabled = hardDisabled || softDisabledForRelease;

  const handleClick = () => {
    if (effectiveDisabled) return;
    onToggle?.(!displayReleased);
  };

  // ── 1) Released (oder pending-released) ───────────────────────────────
  if (displayReleased) {
    const isPending = pendingRelease === true && !isReleased;
    return (
      <div className={cn(
        'w-full rounded-lg border-2 px-3 py-2.5 flex items-center gap-3 transition-all',
        hardDisabled ? 'border-green-300 bg-green-50/60 opacity-80' : 'border-green-400 bg-green-50',
      )}>
        <div className="shrink-0 p-1.5 rounded-full bg-green-200 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">
            {isPending ? 'Wird beim Speichern freigegeben' : 'Freigegeben'}
          </p>
          {!isPending && releasedAt && (
            <p className="text-[11px] text-green-700/80 truncate">
              {new Date(releasedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
              {releasedBy && <> · {releasedBy}</>}
            </p>
          )}
          {isPending && (
            <p className="text-[11px] text-green-700/80">Aufgabe wird beim Speichern gesperrt.</p>
          )}
        </div>
        <Toggle
          on={true}
          disabled={hardDisabled}
          onClick={handleClick}
          title={hardDisabled ? (hierarchyLockMessage || 'Sperre höherer Ebene') : 'Freigabe zurücknehmen'}
        />
      </div>
    );
  }

  // ── 2) Hierarchie-Lock ─────────────────────────────────────────────────
  if (hardDisabled) {
    return (
      <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 flex items-center gap-3">
        <div className="shrink-0 p-1.5 rounded-full bg-slate-200 text-slate-600">
          <Lock className="w-4 h-4" />
        </div>
        <p className="flex-1 text-sm text-slate-700 truncate">
          {hierarchyLockMessage || 'Bearbeitung gesperrt'}
        </p>
      </div>
    );
  }

  // ── 3) Unvollständig ───────────────────────────────────────────────────
  if (softDisabledForRelease) {
    return (
      <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-3">
        <div className="shrink-0 p-1.5 rounded-full bg-amber-100 text-amber-700">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Freigabe — erst nach Vollständigkeit möglich
          </p>
          {missingFields && missingFields.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {missingFields.map((m, i) => (
                <li key={`${m.fieldName}-${i}`} className="text-xs text-amber-800/90 flex items-start gap-1.5">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    <span className="font-medium">{m.label || m.fieldName}</span>
                    {m.reason && <span className="text-amber-700"> — {m.reason}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-amber-800/90 mt-0.5">
              {missingCount > 0
                ? `${missingCount} Pflichtfeld${missingCount === 1 ? '' : 'er'} fehl${missingCount === 1 ? 't' : 'en'}`
                : 'Pflichtfelder fehlen'}
            </p>
          )}
        </div>
        <Toggle on={false} disabled title="Pflichtfelder fehlen" />
      </div>
    );
  }

  // ── 4) Bereit zur Freigabe ─────────────────────────────────────────────
  return (
    <div
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-green-300 bg-green-50/70"
    >
      <div className="shrink-0 p-1.5 rounded-full bg-green-100 text-green-700">
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
      <Toggle on={false} disabled={false} onClick={handleClick} title="Jetzt freigeben" />
    </div>
  );
}